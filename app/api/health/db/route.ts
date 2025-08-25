import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query('SELECT 1 as ok');
    return NextResponse.json({ status: 'ok', db: result.rows[0] }, { status: 200 });
  } catch (err: any) {
    console.error('DB health check failed:', err);
    return NextResponse.json(
      { status: 'error', message: err?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
