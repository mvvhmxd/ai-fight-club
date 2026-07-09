import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
const configuredSecret = process.env.JWT_SECRET;
if (process.env.NODE_ENV === 'production' && !configuredSecret) {
    throw new Error('JWT_SECRET is required when NODE_ENV=production');
}
const JWT_SECRET = configuredSecret || 'development-only-secret-do-not-deploy';
const JWT_EXPIRY = '7d';
export async function hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}
export async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}
export function generateToken(user) {
    return jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
        is_blocked: user.is_blocked,
    }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}
export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    }
    catch (error) {
        return null;
    }
}
export function decodeToken(token) {
    const payload = verifyToken(token);
    if (!payload)
        return null;
    return {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        is_blocked: payload.is_blocked,
    };
}
//# sourceMappingURL=auth.js.map