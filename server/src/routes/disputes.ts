import { Router, Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// Submit a Text-Based Dispute
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const reporterId = req.user!.user_id;
  const { bookingId, issueType, description } = req.body;

  if (!bookingId || !issueType || !description || description.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Booking ID, issue type, and detailed description are required' });
  }

  try {
    // 1. Verify booking participant
    const [bookings] = await pool.execute<RowDataPacket[]>(
      `SELECT b.booking_id, b.driver_user_id, ps.host_user_id 
       FROM BOOKING b 
       JOIN PARKING_SPACE ps ON b.space_id = ps.space_id 
       WHERE b.booking_id = ?`,
      [bookingId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const booking = bookings[0];
    if (booking.driver_user_id !== reporterId && booking.host_user_id !== reporterId && !req.user!.is_admin) {
      return res.status(403).json({ success: false, error: 'Only participants in this booking may submit a dispute' });
    }

    // Assign to demo administrator
    const DEMO_ADMIN_USER_ID = Number(process.env.DEMO_ADMIN_USER_ID || 1);

    const [resHeader] = await pool.execute<ResultSetHeader>(
      `INSERT INTO DISPUTE (
        booking_id, reporter_user_id, administrator_user_id, issue_type, description, dispute_status
      ) VALUES (?, ?, ?, ?, ?, 'open')`,
      [bookingId, reporterId, DEMO_ADMIN_USER_ID, issueType, description]
    );

    return res.status(201).json({
      success: true,
      message: 'Dispute submitted successfully and assigned to platform administrator.',
      dispute_id: resHeader.insertId
    });

  } catch (err) {
    console.error('Submit dispute error:', err);
    return res.status(500).json({ success: false, error: 'Failed to submit dispute' });
  }
});

// View My Filed Disputes
router.get('/my', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const [disputes] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        d.dispute_id,
        d.booking_id,
        d.issue_type,
        d.description,
        d.dispute_status,
        d.resolution,
        b.start_time,
        b.end_time,
        ps.title as space_title
       FROM DISPUTE d
       JOIN BOOKING b ON d.booking_id = b.booking_id
       JOIN PARKING_SPACE ps ON b.space_id = ps.space_id
       WHERE d.reporter_user_id = ?
       ORDER BY d.dispute_id DESC`,
      [req.user!.user_id]
    );

    return res.json({ success: true, disputes });
  } catch (err) {
    console.error('My disputes error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch disputes' });
  }
});

export default router;
