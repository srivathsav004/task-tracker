import { NextRequest } from 'next/server';
import { verifyToken } from './auth';

export const getAuthUser = (request: NextRequest): { userId: number } | null => {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  return verifyToken(token);
};