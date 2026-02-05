import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken, type AuthTokenPayload } from './auth.service';
import type { User } from '../db/schema';

type UserWithoutPassword = Omit<User, 'passwordHash'>;

export interface AuthenticatedRequest extends NextRequest {
    user?: UserWithoutPassword;
}

/**
 * Higher-order function to wrap API route handlers with authentication
 */
export function withAuth(
    handler: (
        request: AuthenticatedRequest,
        context: { params: Record<string, string> },
        user: UserWithoutPassword
    ) => Promise<NextResponse>
) {
    return async (
        request: NextRequest,
        context: { params: Record<string, string> }
    ) => {
        const authHeader = request.headers.get('authorization');
        const user = await getUserFromToken(authHeader);

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        return handler(request as AuthenticatedRequest, context, user);
    };
}

/**
 * Check if user has required role
 */
export function requireRole(
    user: UserWithoutPassword,
    roles: string[]
): boolean {
    return roles.includes(user.role);
}

/**
 * Middleware to check role
 */
export function withRole(
    roles: string[],
    handler: (
        request: AuthenticatedRequest,
        context: { params: Record<string, string> },
        user: UserWithoutPassword
    ) => Promise<NextResponse>
) {
    return withAuth(async (request, context, user) => {
        if (!requireRole(user, roles)) {
            return NextResponse.json(
                { error: 'Forbidden - insufficient permissions' },
                { status: 403 }
            );
        }
        return handler(request, context, user);
    });
}
