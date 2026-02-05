import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { db } from '../db';
import { users, type User, type NewUser } from '../db/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
const JWT_EXPIRES_IN = '7d' as const;
const SALT_ROUNDS = 12;

export interface AuthTokenPayload {
    userId: number;
    email: string;
    role: string;
}

export interface AuthResult {
    success: boolean;
    user?: Omit<User, 'passwordHash'>;
    token?: string;
    error?: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token
 */
export function generateToken(payload: AuthTokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): AuthTokenPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    } catch {
        return null;
    }
}

/**
 * Register a new user
 */
export async function registerUser(
    email: string,
    password: string,
    name?: string
): Promise<AuthResult> {
    try {
        // Check if user already exists
        const existingUser = await db.query.users.findFirst({
            where: eq(users.email, email.toLowerCase()),
        });

        if (existingUser) {
            return { success: false, error: 'Email already registered' };
        }

        // Validate password strength
        if (password.length < 8) {
            return { success: false, error: 'Password must be at least 8 characters' };
        }

        // Hash password and create user
        const passwordHash = await hashPassword(password);
        const [newUser] = await db.insert(users).values({
            email: email.toLowerCase(),
            passwordHash,
            name: name || email.split('@')[0],
            role: 'user',
        }).returning();

        // Generate token
        const token = generateToken({
            userId: newUser.id,
            email: newUser.email,
            role: newUser.role,
        });

        // Return user without password hash
        const { passwordHash: _, ...userWithoutPassword } = newUser;
        return {
            success: true,
            user: userWithoutPassword,
            token,
        };
    } catch (error: any) {
        console.error('Registration error:', error);
        return { success: false, error: 'Failed to register user' };
    }
}

/**
 * Login a user
 */
export async function loginUser(email: string, password: string): Promise<AuthResult> {
    try {
        // Find user by email
        const user = await db.query.users.findFirst({
            where: eq(users.email, email.toLowerCase()),
        });

        if (!user) {
            return { success: false, error: 'Invalid email or password' };
        }

        // Verify password
        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
            return { success: false, error: 'Invalid email or password' };
        }

        // Generate token
        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        // Update last login (optional - could add a lastLogin field)
        await db.update(users)
            .set({ updatedAt: new Date() })
            .where(eq(users.id, user.id));

        // Return user without password hash
        const { passwordHash: _, ...userWithoutPassword } = user;
        return {
            success: true,
            user: userWithoutPassword,
            token,
        };
    } catch (error: any) {
        console.error('Login error:', error);
        return { success: false, error: 'Failed to login' };
    }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number): Promise<Omit<User, 'passwordHash'> | null> {
    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
        });

        if (!user) return null;

        const { passwordHash: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    } catch {
        return null;
    }
}

/**
 * Middleware helper to extract user from token
 */
export async function getUserFromToken(authHeader: string | null): Promise<Omit<User, 'passwordHash'> | null> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
        return null;
    }

    return getUserById(payload.userId);
}
