import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../database/connection';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    phone: string;
    scopes: string[];
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Verify user still exists and is active
    const userResult = await query(
      'SELECT id, role, phone, scopes, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      return res.status(401).json({ message: 'Invalid or inactive user' });
    }

    const user = userResult.rows[0];
    let scopes: string[] = [];
    if (Array.isArray(user.scopes)) {
      scopes = user.scopes;
    } else if (typeof user.scopes === 'string') {
      try {
        scopes = JSON.parse(user.scopes);
      } catch {
        scopes = [];
      }
    }

    req.user = {
      id: user.id,
      role: user.role,
      phone: user.phone,
      scopes
    };

    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};

export const requireScope = (scope: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Managers have full system access
    if (req.user.role === 'MANAGER') {
      return next();
    }

    const userScopes = req.user.scopes || [];
    if (userScopes.includes(scope)) {
      return next();
    }

    return res.status(403).json({ message: `Access denied: scope '${scope}' required` });
  };
};

export const requireRoleOrScope = (roles: string[], scope?: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (roles.includes(req.user.role)) {
      return next();
    }

    if (scope && req.user.scopes && req.user.scopes.includes(scope)) {
      return next();
    }

    return res.status(403).json({ message: 'Insufficient permissions' });
  };
};
