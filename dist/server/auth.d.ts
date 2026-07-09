import { User } from '../shared/schema';
export declare function hashPassword(password: string): Promise<string>;
export declare function verifyPassword(password: string, hash: string): Promise<boolean>;
export declare function generateToken(user: User): string;
export declare function verifyToken(token: string): any;
export interface AuthPayload {
    id: string;
    email: string;
    role: 'member' | 'admin';
    is_blocked: boolean;
}
export declare function decodeToken(token: string): AuthPayload | null;
//# sourceMappingURL=auth.d.ts.map