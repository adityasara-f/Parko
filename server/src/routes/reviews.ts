import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// Submit Review for a Completed Booking (Mutual Reviews)
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const reviewerId = req.user!.user_id;
  const bookingId = req.body.bookingId ?? req.body.booking_id;
  const { rating, comment } = req.body;

  if (!bookingId || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, error: 'Valid booking ID and rating between 1 and 5 required' });
  }

  try {
    // 1. Fetch booking details
    const [bookings] = await pool.execute<RowDataPacket[]>(
      `SELECT b.booking_id, b.space_id, b.driver_user_id, b.booking_status, b.end_time, ps.host_user_id
       FROM BOOKING b
       JOIN PARKING_SPACE ps ON b.space_id = ps.space_id
       WHERE b.booking_id = ?`,
      [bookingId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const booking = bookings[0];

    // Auto-mark booking completed if end_time has passed
    if (booking.booking_status === 'confirmed' && new Date(booking.end_time) <= new Date()) {
      await pool.execute("UPDATE BOOKING SET booking_status = 'completed' WHERE booking_id = ?", [bookingId]);
      booking.booking_status = 'completed';
    }

    // Reviews can ONLY be submitted after booking completion
    if (booking.booking_status !== 'completed') {
      return res.status(400).json({ 
        success: false, 
        error: 'Reviews can only be submitted for completed bookings' 
      });
    }

    // Determine reviewed user: Driver reviews Host, Host reviews Driver
    let reviewedUserId: number;

    if (reviewerId === booking.driver_user_id) {
      reviewedUserId = booking.host_user_id;
    } else if (reviewerId === booking.host_user_id) {
      reviewedUserId = booking.driver_user_id;
    } else {
      return res.status(403).json({ success: false, error: 'You are not a participant in this booking' });
    }

    // Check if reviewer has already reviewed this booking
    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT review_id FROM REVIEW WHERE booking_id = ? AND reviewer_user_id = ?',
      [bookingId, reviewerId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'You have already submitted a review for this booking' });
    }

    // Enforce no more than two reviews per booking
    const [reviewCount] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as total_reviews FROM REVIEW WHERE booking_id = ?',
      [bookingId]
    );
    if ((reviewCount[0] as any).total_reviews >= 2) {
      return res.status(400).json({ success: false, error: 'Maximum of two mutual reviews allowed per booking' });
    }

    // Insert Review
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO REVIEW (booking_id, reviewer_user_id, reviewed_user_id, rating, comment)
       VALUES (?, ?, ?, ?, ?)`,
      [bookingId, reviewerId, reviewedUserId, rating, comment || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      review_id: result.insertId
    });

  } catch (err: any) {
    console.error('Review submit error:', err);
    return res.status(500).json({ success: false, error: 'Failed to submit review' });
  }
});

// Get Reviews for a Parking Space
router.get('/space/:spaceId', async (req: Request, res: Response) => {
  const { spaceId } = req.params;

  try {
    const [reviews] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        r.review_id,
        r.rating,
        r.comment,
        u.name AS reviewer_name
       FROM REVIEW r
       JOIN BOOKING b ON r.booking_id = b.booking_id
       JOIN USER u ON r.reviewer_user_id = u.user_id
       WHERE b.space_id = ? AND r.reviewed_user_id != u.user_id
       ORDER BY r.review_id DESC`,
      [spaceId]
    );

    return res.json({ success: true, reviews });
  } catch (err) {
    console.error('Space reviews fetch error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch reviews' });
  }
});

export default router;
