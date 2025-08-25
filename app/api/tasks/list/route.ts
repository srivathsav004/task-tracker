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

    const { searchParams } = new URL(request.url);
    const viewAll = searchParams.get('all') === 'true';

    let query = `
      SELECT 
        t.*,
        u.name as user_name
      FROM tasks t
      JOIN users u ON t.user_id = u.id
    `;
    let params: any[] = [];

    if (!viewAll) {
      query += ' WHERE t.user_id = $1';
      params.push(auth.userId);
    }

    query += ' ORDER BY t.id DESC';

    const result = await pool.query(query, params);

    return NextResponse.json({ tasks: result.rows });
  } catch (error) {
    console.error('List tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}