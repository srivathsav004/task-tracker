import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminEmail = 'hemanth.v@trst01.com';
    const ures = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [auth.userId]);
    const email = ures.rows[0]?.email as string | undefined;
    const isAdmin = email === adminEmail;
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'created' | 'status_update' | null
    const q = searchParams.get('q'); // search query
    const from = searchParams.get('from'); // ISO date string
    const to = searchParams.get('to'); // ISO date string
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
    const offset = (page - 1) * pageSize;

    // Build dynamic WHERE for both arms
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

    // Try to include task_logs table for admin/user actions; if it doesn't exist, fallback gracefully
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
      const countSql = `SELECT COUNT(*)::int AS count FROM (${compoundBase}) as logs ${whereClause}`;
      const countRes = await pool.query(countSql, params);
      const total: number = countRes.rows[0]?.count || 0;

      const dataSql = `
        SELECT at, type, task_id, client_name, customer_account_exec, user_name, status
        FROM (${compoundBase}) as logs
        ${whereClause}
        ORDER BY at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `;
      const dataRes = await pool.query(dataSql, params);
      const logs = dataRes.rows.map((r) => ({
        at: r.at,
        type: r.type,
        task_id: r.task_id,
        client_name: r.client_name,
        customer_account_exec: r.customer_account_exec,
        user_name: r.user_name,
        details: r.type === 'created' ? 'task created' : r.type === 'status_update' ? `status: ${r.status}` : r.type,
        current_status: r.status,
      }));
      return { total, logs };
    };

    let total = 0;
    let logs: any[] = [];
    try {
      const res = await runQuery(baseWithActivity);
      total = res.total;
      logs = res.logs;
    } catch (e) {
      const res = await runQuery(base);
      total = res.total;
      logs = res.logs;
    }

    return NextResponse.json({ logs, page, pageSize, total });
  } catch (error) {
    console.error('Logs list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
