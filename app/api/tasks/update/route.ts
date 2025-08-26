import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';
import { TaskStatus } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, current_status } = await request.json();

    if (!id || typeof id !== 'number') {
      return NextResponse.json({ error: 'Invalid or missing task id' }, { status: 400 });
    }

    const allowed: TaskStatus[] = ['Open', 'In-Progress', 'Resolved', 'Closed'];
    if (!current_status || !allowed.includes(current_status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Determine if the caller is admin by email
    const adminEmail = 'hemanth.v@trst01.com';
    const ures = await pool.query('SELECT email FROM users WHERE id = $1', [auth.userId]);
    const email = ures.rows[0]?.email as string | undefined;
    const isAdmin = email === adminEmail;

    let result;
    if (isAdmin) {
      // Admin can update any task; also update updated_at so admin actions are logged
      result = await pool.query(
        `UPDATE tasks SET current_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [current_status, id]
      );
    } else {
      // Regular user can update only own task and must update updated_at
      result = await pool.query(
        `UPDATE tasks
         SET current_status = $1, updated_at = NOW()
         WHERE id = $2 AND user_id = $3
         RETURNING *`,
        [current_status, id, auth.userId]
      );
    }

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Best-effort activity log (if table exists)
    try {
      await pool.query(
        `INSERT INTO task_logs (task_id, actor_user_id, action, details, at)
         VALUES ($1, $2, 'status_update', $3, NOW())`,
        [id, auth.userId, `status: ${current_status}`]
      );
    } catch (_) {
      // ignore if task_logs does not exist
    }

    return NextResponse.json({ message: 'Task updated successfully', task: result.rows[0] });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
