import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { User } from '../shared/schema.js';

const configuredSecret = process.env.JWT_SECRET;
const JWT_SECRET = configuredSecret || 'development-only-secret-do-not-deploy';
const JWT_EXPIRY = '7d';

function getJwtSecret(): string {
  if (process.env.NODE_ENV === 'production' && !configuredSecret) {
    throw new Error('JWT_SECRET is required when NODE_ENV=production');
  }
  return JWT_SECRET;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      is_blocked: user.is_blocked,
    },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRY }
  );
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (error) {
    return null;
  }
}

export interface AuthPayload {
  id: string;
  email: string;
  role: 'member' | 'admin';
  is_blocked: boolean;
}

export function decodeToken(token: string): AuthPayload | null {
  const payload = verifyToken(token);
  if (!payload) return null;
  return {
    id: payload.id,
    email: payload.email,
    role: payload.role,
    is_blocked: payload.is_blocked,
  };
}
