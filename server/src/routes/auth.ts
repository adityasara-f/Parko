import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'parko_super_secure_jwt_secret_token_2026_demo';
const DEMO_ADMIN_USER_ID = Number(process.env.DEMO_ADMIN_USER_ID || 1);

// In-memory OTP storage for simulated demo phone authentication
interface OtpEntry {
  code: string;
  phone: string;
  expiresAt: number;
}
const otpStore = new Map<string, OtpEntry>();

// Request Demo OTP (simulated phone login)
router.post('/otp/request', async (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone || phone.length < 8) {
    return res.status(400).json({ success: false, error: 'Valid phone number is required' });
  }

  // Generate 6-digit demo OTP
  const demoOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  otpStore.set(phone, { code: demoOtp, phone, expiresAt });

  try {
    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT user_id, name FROM USER WHERE phone = ?',
      [phone]
    );

    const userExists = existing.length > 0;
    const userName = userExists ? existing[0].name : null;

    return res.json({
      success: true,
      message: 'Demo OTP generated successfully',
      demo_otp: demoOtp, // Displayed in UI for simulated course demonstration
      user_exists: userExists,
      name: userName,
      expires_in_seconds: 300
    });
  } catch (err) {
    return res.json({
      success: true,
      message: 'Demo OTP generated successfully',
      demo_otp: demoOtp,
      user_exists: false,
      expires_in_seconds: 300
    });
  }
});

// Verify Demo OTP and Sign In / Register
router.post('/otp/verify', async (req: Request, res: Response) => {
  const { phone, code, name } = req.body;

  if (!phone || !code) {
    return res.status(400).json({ success: false, error: 'Phone and code are required' });
  }

  const stored = otpStore.get(phone);
  if (!stored) {
    return res.status(400).json({ success: false, error: 'No OTP requested for this phone number' });
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phone);
    return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new one.' });
  }

  if (stored.code !== code) {
    return res.status(400).json({ success: false, error: 'Incorrect OTP. Please check the simulated demo code.' });
  }

  // Consume OTP (single use)
  otpStore.delete(phone);

  try {
    // Check if user exists by phone
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT user_id, name, email, phone, account_status FROM USER WHERE phone = ?',
      [phone]
    );

    let user: any;

    if (rows.length > 0) {
      user = rows[0];
      if (user.account_status === 'suspended') {
        return res.status(403).json({ success: false, error: 'This account has been suspended.' });
      }
    } else {
      // Auto-register new phone user
      const defaultEmail = `user_${Date.now()}@parko-demo.com`;
      const defaultName = name || `User ${phone.slice(-4)}`;
      const dummyHash = await bcrypt.hash('parko_phone_auth', 10);

      const [insertRes] = await pool.execute<ResultSetHeader>(
        `INSERT INTO USER (name, email, phone, password_hash, account_status)
         VALUES (?, ?, ?, ?, 'active')`,
        [defaultName, defaultEmail, phone, dummyHash]
      );

      const newUserId = insertRes.insertId;

      // Persist phone verification in USER_VERIFICATION
      await pool.execute(
        `INSERT INTO USER_VERIFICATION (user_id, verification_type, verification_status, verified_at)
         VALUES (?, 'phone_otp', 'verified', NOW())`,
        [newUserId]
      );

      user = {
        user_id: newUserId,
        name: defaultName,
        email: defaultEmail,
        phone,
        account_status: 'active'
      };
    }

    const token = jwt.sign({ user_id: user.user_id }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('parko_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      token,
      user: {
        ...user,
        is_admin: user.user_id === DEMO_ADMIN_USER_ID
      }
    });
  } catch (err: any) {
    console.error('OTP verify error:', err);
    return res.status(500).json({ success: false, error: 'Database error verifying OTP' });
  }
});

// Standard Email/Password Register
router.post('/register', async (req: Request, res: Response) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !phone || !password) {
    return res.status(400).json({ success: false, error: 'All fields are required' });
  }

  try {
    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT user_id FROM USER WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [insertRes] = await pool.execute<ResultSetHeader>(
      `INSERT INTO USER (name, email, phone, password_hash, account_status)
       VALUES (?, ?, ?, ?, 'active')`,
      [name, email, phone, password_hash]
    );

    const userId = insertRes.insertId;

    // Record initial phone verification
    await pool.execute(
      `INSERT INTO USER_VERIFICATION (user_id, verification_type, verification_status, verified_at)
       VALUES (?, 'email_confirmation', 'verified', NOW())`,
      [userId]
    );

    const token = jwt.sign({ user_id: userId }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('parko_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      token,
      user: {
        user_id: userId,
        name,
        email,
        phone,
        account_status: 'active',
        is_admin: userId === DEMO_ADMIN_USER_ID
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// Email/Password Login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password required' });
  }

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT user_id, name, email, phone, password_hash, account_status FROM USER WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const user = rows[0];

    if (user.account_status === 'suspended') {
      return res.status(403).json({ success: false, error: 'Account has been suspended' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = jwt.sign({ user_id: user.user_id }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('parko_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        account_status: user.account_status,
        is_admin: user.user_id === DEMO_ADMIN_USER_ID
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('parko_token');
  return res.json({ success: true, message: 'Logged out successfully' });
});

// Current User Profile & Verifications
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const [verifs] = await pool.execute<RowDataPacket[]>(
      'SELECT verification_id, verification_type, verification_status, verified_at FROM USER_VERIFICATION WHERE user_id = ?',
      [req.user!.user_id]
    );

    return res.json({
      success: true,
      user: req.user,
      verifications: verifs
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch user profile' });
  }
});

// Update Profile (Only fields present in USER)
router.put('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { name, phone } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ success: false, error: 'Name and phone required' });
  }

  try {
    await pool.execute(
      'UPDATE USER SET name = ?, phone = ? WHERE user_id = ?',
      [name, phone, req.user!.user_id]
    );

    return res.json({
      success: true,
      message: 'Profile updated',
      user: {
        ...req.user,
        name,
        phone
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

export default router;
