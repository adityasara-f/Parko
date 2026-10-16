import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';
import { RowDataPacket } from 'mysql2';

const JWT_SECRET = process.env.JWT_SECRET || 'parko_super_secure_jwt_secret_token_2026_demo';
const DEMO_ADMIN_USER_ID = Number(process.env.DEMO_ADMIN_USER_ID || 1);

export interface AuthenticatedUser {
  user_id: number;
  name: string;
  email: string;
  phone: string;
  account_status: string;
  is_admin: boolean;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  let token = req.cookies?.parko_token;

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { user_id: number };
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT user_id, name, email, phone, account_status FROM USER WHERE user_id = ?',
      [decoded.user_id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const user = rows[0];
    if (user.account_status === 'suspended') {
      return res.status(403).json({ success: false, error: 'Account has been suspended' });
    }

    req.user = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      account_status: user.account_status,
      is_admin: user.user_id === DEMO_ADMIN_USER_ID
    };

    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session' });
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  let token = req.cookies?.parko_token;
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { user_id: number };
    pool.execute<RowDataPacket[]>(
      'SELECT user_id, name, email, phone, account_status FROM USER WHERE user_id = ?',
      [decoded.user_id]
    ).then(([rows]) => {
      if (rows.length > 0 && rows[0].account_status !== 'suspended') {
        const user = rows[0];
        req.user = {
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          account_status: user.account_status,
          is_admin: user.user_id === DEMO_ADMIN_USER_ID
        };
      }
      next();
    }).catch(() => next());
  } catch {
    next();
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  if (!req.user.is_admin) {
    return res.status(403).json({ success: false, error: 'Administrator access required' });
  }

  next();
}
