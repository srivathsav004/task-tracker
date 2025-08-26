import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      date_raised,
      client_name,
      description,
      customer_account_exec,
      current_status,
      resolution_date,
      deadline,
      remarks
    } = await request.json();

    // Validate required fields (all mandatory)
    const entries = {
      date_raised,
      client_name,
      description,
      customer_account_exec,
      current_status,
      resolution_date,
      deadline,
      remarks,
    } as Record<string, unknown>;

    const missing = Object.entries(entries)
      .filter(([_, v]) => {
        if (v === null || v === undefined) return true;
        if (typeof v === 'string' && v.trim() === '') return true;
        return false;
      })
      .map(([k]) => k);

    if (missing.length > 0) {
      return NextResponse.json(
        { error: 'Missing required fields', missing },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO tasks (
        user_id, date_raised, client_name, description,
        customer_account_exec, current_status, resolution_date, deadline, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        auth.userId,
        date_raised,
        client_name,
        description,
        customer_account_exec,
        current_status,
        resolution_date,
        deadline,
        remarks
      ]
    );

    // Best-effort activity log (if table exists)
    try {
      const createdTaskId = result.rows[0]?.id;
      if (createdTaskId) {
        await pool.query(
          `INSERT INTO task_logs (task_id, actor_user_id, action, details, at)
           VALUES ($1, $2, 'created', 'task created', NOW())`,
          [createdTaskId, auth.userId]
        );
      }
    } catch (_) {
      // ignore if task_logs does not exist
    }

    return NextResponse.json({ 
      message: 'Task created successfully',
      task: result.rows[0]
    });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
