import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

// This API route must be dynamic because it reads the request body and hits the DB
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, passwordHash]
    );

    return NextResponse.json({ 
      message: 'User created successfully',
      user: result.rows[0]
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    const isProd = process.env.NODE_ENV === 'production';
    const payload = isProd
      ? { error: 'Internal server error' }
      : { error: 'Internal server error', detail: error?.message, code: error?.code, hint: error?.hint }; 
    return NextResponse.json(payload, { status: 500 });
  }
}