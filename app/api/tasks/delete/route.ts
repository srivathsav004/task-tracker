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

    const { id } = await request.json();
    if (!id || typeof id !== 'number') {
      return NextResponse.json({ error: 'Invalid or missing task id' }, { status: 400 });
    }

    // Check admin by email
    const adminEmail = 'hemanth.v@trst01.com';
    const ures = await pool.query('SELECT email FROM users WHERE id = $1', [auth.userId]);
    const email = ures.rows[0]?.email as string | undefined;
    const isAdmin = email === adminEmail;

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Best-effort activity log (if table exists)
    try {
      await pool.query(
        `INSERT INTO task_logs (task_id, actor_user_id, action, details, at)
         VALUES ($1, $2, 'deleted', 'task deleted', NOW())`,
        [id, auth.userId]
      );
    } catch (_) {
      // ignore if task_logs does not exist
    }

    return NextResponse.json({ message: 'Task deleted' });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
