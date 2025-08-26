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

    // Only allow the owner to update their task
    const result = await pool.query(
      `UPDATE tasks
       SET current_status = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [current_status, id, auth.userId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Task updated successfully', task: result.rows[0] });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
