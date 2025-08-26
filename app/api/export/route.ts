import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthUser(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Restrict to admin via email
    const adminEmail = 'hemanth.v@trst01.com';
    const ures = await pool.query('SELECT email FROM users WHERE id = $1', [auth.userId]);
    const email = ures.rows[0]?.email as string | undefined;
    const isAdmin = email === adminEmail;
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || '';
    const q = searchParams.get('q') || '';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Build WHERE
    const conditions: string[] = [];
    const params: any[] = [];

    if (type) {
      params.push(type);
      conditions.push('type = $' + params.length);
    }
    if (q) {
      params.push(`%${q}%`); // client_name
      params.push(`%${q}%`); // user_name
      params.push(`%${q}%`); // task_id
      params.push(`%${q}%`); // customer_account_exec
      conditions.push('(client_name ILIKE $' + (params.length - 3) + ' OR user_name ILIKE $' + (params.length - 2) + ' OR CAST(task_id AS TEXT) ILIKE $' + (params.length - 1) + ' OR customer_account_exec ILIKE $' + params.length + ')');
    }
    if (from) {
      params.push(from);
      conditions.push('at >= $' + params.length);
    }
    if (to) {
      params.push(to);
      conditions.push('at <= $' + params.length);
    }
    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    // Base derived logs from tasks
    const base = `
      (
        SELECT t.created_at AS at,
               'created'::text AS type,
               t.id AS task_id,
               t.client_name,
               t.customer_account_exec,
               u.name AS user_name,
               t.current_status::text AS status
        FROM tasks t
        LEFT JOIN users u ON t.user_id = u.id
      )
      UNION ALL
      (
        SELECT t.updated_at AS at,
               'status_update'::text AS type,
               t.id AS task_id,
               t.client_name,
               t.customer_account_exec,
               u.name AS user_name,
               t.current_status::text AS status
        FROM tasks t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.updated_at IS NOT NULL
      )
    `;

    // Attempt to include task_logs; fallback if it doesn't exist
    const baseWithActivity = `
      ${base}
      UNION ALL
      (
        SELECT tl.at AS at,
               tl.action::text AS type,
               tl.task_id AS task_id,
               t.client_name AS client_name,
               t.customer_account_exec AS customer_account_exec,
               u.name AS user_name,
               t.current_status::text AS status
        FROM task_logs tl
        LEFT JOIN tasks t ON t.id = tl.task_id
        LEFT JOIN users u ON tl.actor_user_id = u.id
      )
    `;

    const runQuery = async (compoundBase: string) => {
      const sql = `
        SELECT at, type, task_id, client_name, customer_account_exec, user_name, status
        FROM (${compoundBase}) AS logs
        ${whereClause}
        ORDER BY at DESC
      `;
      const res = await pool.query(sql, params);
      return res.rows as Array<{
        at: string;
        type: string;
        task_id: number;
        client_name: string | null;
        customer_account_exec: string | null;
        user_name: string | null;
        status: string | null;
      }>;
    };

    let rows: Awaited<ReturnType<typeof runQuery>> = [];
    try {
      rows = await runQuery(baseWithActivity);
    } catch {
      rows = await runQuery(base);
    }

    // Build CSV: headers then data. Keep timestamp in ISO to avoid server TZ issues.
    const headers = [
      'when',
      'type',
      'task_id',
      'client_name',
      'customer_account_exec',
      'user_name',
      'current_status',
      'details'
    ];

    const escape = (val: any) => {
      if (val === null || val === undefined) return '';
      const s = String(val);
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };

    const lines: string[] = [];
    lines.push(headers.join(','));
    for (const r of rows) {
      const details = r.type === 'created' ? 'task created' : r.type === 'status_update' ? `status: ${r.status ?? ''}` : r.type;
      lines.push([
        new Date(r.at).toISOString(),
        r.type,
        r.task_id,
        r.client_name ?? '',
        r.customer_account_exec ?? '',
        r.user_name ?? '',
        r.status ?? '',
        details
      ].map(escape).join(','));
    }

    const csv = lines.join('\n');
    const filename = `logs_export_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('Logs export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
