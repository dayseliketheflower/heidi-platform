import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

/**
 * Authentication middleware - verifies JWT token
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Authorization middleware - checks user role
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

/**
 * Membership enforcement middleware - checks if client has active membership
 */
export async function requireActiveMembership(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== 'CLIENT') {
      return next(); // Only applies to clients
    }

    const { prisma } = await import('../server');
    
    const clientProfile = await prisma.clientProfile.findUnique({
      where: { userId: req.user.userId },
      include: { membership: true },
    });

    if (!clientProfile?.membership) {
      return res.status(403).json({ 
        error: 'Active membership required',
        message: 'Please purchase a membership to access this feature',
      });
    }

    if (clientProfile.membership.status !== 'ACTIVE') {
      return res.status(403).json({ 
        error: 'Active membership required',
        message: 'Your membership is not active. Please renew to continue.',
        membershipStatus: clientProfile.membership.status,
      });
    }

    const now = new Date();
    if (clientProfile.membership.endDate < now) {
      return res.status(403).json({ 
        error: 'Membership expired',
        message: 'Your membership has expired. Please renew to continue.',
      });
    }

    next();
  } catch (error) {
    console.error('Membership check error:', error);
    res.status(500).json({ error: 'Failed to verify membership' });
  }
}
