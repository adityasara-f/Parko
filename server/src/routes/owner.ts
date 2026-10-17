import { Router, Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { BookingHoldManager } from '../services/holdManager';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// Owner Dashboard Overview
router.get('/dashboard', authenticateToken, async (req: AuthRequest, res: Response) => {
  const hostId = req.user!.user_id;

  try {
    // 1. Listings counts
    const [listings] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        COUNT(DISTINCT space_id) as total_spaces,
        COUNT(DISTINCT CASE WHEN listing_status = 'approved' THEN space_id END) as active_listings,
        COUNT(DISTINCT CASE WHEN listing_status = 'pending_verification' THEN space_id END) as pending_listings,
        COUNT(DISTINCT CASE WHEN listing_status = 'rejected' THEN space_id END) as rejected_listings
       FROM PARKING_SPACE
       WHERE host_user_id = ?`,
      [hostId]
    );

    // 2. Bookings counts
    const [bookings] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        COUNT(DISTINCT CASE WHEN b.booking_status = 'pending_approval' THEN b.booking_id END) as pending_approvals,
        COUNT(DISTINCT CASE WHEN b.booking_status = 'confirmed' AND b.end_time >= NOW() THEN b.booking_id END) as upcoming_bookings,
        COUNT(DISTINCT CASE WHEN b.booking_status = 'completed' THEN b.booking_id END) as completed_bookings,
        COALESCE(SUM(CASE WHEN b.booking_status = 'completed' THEN b.amount ELSE 0 END), 0) as total_earnings
       FROM BOOKING b
       JOIN PARKING_SPACE ps ON b.space_id = ps.space_id
       WHERE ps.host_user_id = ?`,
      [hostId]
    );

    return res.json({
      success: true,
      stats: {
        ...listings[0],
        ...bookings[0]
      }
    });
  } catch (err) {
    console.error('Owner dashboard error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load dashboard' });
  }
});

// Owner's Parking Spaces List
router.get('/spaces', authenticateToken, async (req: AuthRequest, res: Response) => {
  const hostId = req.user!.user_id;

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        ps.space_id,
        ps.title,
        ps.description,
        ps.vehicle_category,
        ps.hourly_rate,
        ps.daily_rate,
        ps.access_method,
        ps.approval_mode,
        ps.listing_status,
        ps.approximate_latitude,
        ps.approximate_longitude,
        psl.exact_address,
        psl.precise_latitude,
        psl.precise_longitude,
        psl.private_notes,
        lv.verification_status as admin_verification_status
       FROM PARKING_SPACE ps
       LEFT JOIN PRIVATE_SPACE_LOCATION psl ON ps.space_id = psl.space_id
       LEFT JOIN LISTING_VERIFICATION lv ON ps.space_id = lv.space_id
       WHERE ps.host_user_id = ?
       ORDER BY ps.space_id DESC`,
      [hostId]
    );

    return res.json({ success: true, spaces: rows });
  } catch (err) {
    console.error('Owner spaces error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load owner spaces' });
  }
});

// Create New Parking Space (Multi-step wizard submission)
router.post('/spaces', authenticateToken, async (req: AuthRequest, res: Response) => {
  const hostId = req.user!.user_id;
  const {
    title,
    description,
    vehicle_category,
    hourly_rate,
    access_method,
    approval_mode = 'instant',
    exact_address,
    precise_latitude,
    precise_longitude,
    private_notes,
    city_id = 1
  } = req.body;

  if (!title || !description || !vehicle_category || !hourly_rate || !access_method || !exact_address || !precise_latitude || !precise_longitude) {
    return res.status(400).json({ success: false, error: 'All space details and location coordinates are required' });
  }

  // Derive approximate coords by introducing intentional 0.0005 offset (~50 meters) for public browsing safety
  const approxLat = (parseFloat(precise_latitude) + 0.0003).toFixed(7);
  const approxLng = (parseFloat(precise_longitude) - 0.0003).toFixed(7);
  const dailyRate = (parseFloat(hourly_rate) * 7.5).toFixed(2); // Retained for frozen schema contract

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Insert PARKING_SPACE with pending_verification status
    const [spaceRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO PARKING_SPACE (
        host_user_id, city_id, title, description, vehicle_category,
        hourly_rate, daily_rate, access_method, approval_mode, listing_status,
        approximate_latitude, approximate_longitude
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_verification', ?, ?)`,
      [
        hostId, city_id, title, description, vehicle_category,
        hourly_rate, dailyRate, access_method, approval_mode,
        approxLat, approxLng
      ]
    );

    const spaceId = spaceRes.insertId;

    // 2. Insert PRIVATE_SPACE_LOCATION
    await connection.execute(
      `INSERT INTO PRIVATE_SPACE_LOCATION (
        space_id, exact_address, precise_latitude, precise_longitude, private_notes
      ) VALUES (?, ?, ?, ?, ?)`,
      [spaceId, exact_address, precise_latitude, precise_longitude, private_notes || '']
    );

    // 3. Insert LISTING_VERIFICATION record
    const DEMO_ADMIN_USER_ID = Number(process.env.DEMO_ADMIN_USER_ID || 1);
    await connection.execute(
      `INSERT INTO LISTING_VERIFICATION (
        space_id, reviewer_user_id, verification_status, decision_at
      ) VALUES (?, ?, 'pending', NULL)`,
      [spaceId, DEMO_ADMIN_USER_ID]
    );

    // 4. Create initial availability windows (supports expanded recurring schedule windows from Step 4)
    const { windows } = req.body;
    if (Array.isArray(windows) && windows.length > 0) {
      for (const w of windows) {
        if (new Date(w.end_time) > new Date(w.start_time)) {
          await connection.execute(
            `INSERT INTO AVAILABILITY_WINDOW (space_id, start_time, end_time, availability_status)
             VALUES (?, ?, ?, 'available')`,
            [spaceId, w.start_time, w.end_time]
          );
        }
      }
    } else {
      await connection.execute(
        `INSERT INTO AVAILABILITY_WINDOW (space_id, start_time, end_time, availability_status)
         VALUES (?, DATE_ADD(CURRENT_DATE, INTERVAL 8 HOUR), DATE_ADD(CURRENT_DATE, INTERVAL 22 HOUR), 'available')`,
        [spaceId]
      );
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Parking space submitted successfully. Awaiting administrator verification.',
      space_id: spaceId
    });

  } catch (err) {
    await connection.rollback();
    console.error('Create space error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create parking space' });
  } finally {
    connection.release();
  }
});

// Manage Availability Windows (Add one-off or expand recurring schedule into individual windows)
router.post('/spaces/:id/availability', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const hostId = req.user!.user_id;
  const { windows } = req.body; // Array of { start_time, end_time }

  if (!Array.isArray(windows) || windows.length === 0) {
    return res.status(400).json({ success: false, error: 'At least one availability window is required' });
  }

  try {
    // Verify space ownership
    const [spaces] = await pool.execute<RowDataPacket[]>(
      'SELECT space_id FROM PARKING_SPACE WHERE space_id = ? AND host_user_id = ?',
      [id, hostId]
    );

    if (spaces.length === 0) {
      return res.status(403).json({ success: false, error: 'Unauthorized or space not found' });
    }

    for (const w of windows) {
      if (new Date(w.end_time) <= new Date(w.start_time)) {
        return res.status(400).json({ success: false, error: 'End time must be after start time' });
      }

      await pool.execute(
        `INSERT INTO AVAILABILITY_WINDOW (space_id, start_time, end_time, availability_status)
         VALUES (?, ?, ?, 'available')`,
        [id, w.start_time, w.end_time]
      );
    }

    return res.json({ success: true, message: `Successfully added ${windows.length} availability window(s)` });

  } catch (err) {
    console.error('Availability update error:', err);
    return res.status(500).json({ success: false, error: 'Failed to add availability windows' });
  }
});

// Owner's Incoming Booking Requests
router.get('/bookings', authenticateToken, async (req: AuthRequest, res: Response) => {
  const hostId = req.user!.user_id;

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        b.booking_id,
        b.space_id,
        ps.title AS space_title,
        b.driver_user_id,
        u.name AS driver_name,
        u.phone AS driver_phone,
        b.start_time,
        b.end_time,
        b.booking_type,
        b.booking_status,
        b.amount,
        b.currency,
        b.cancellation_reason,
        r.review_id AS host_review_id
       FROM BOOKING b
       JOIN PARKING_SPACE ps ON b.space_id = ps.space_id
       JOIN USER u ON b.driver_user_id = u.user_id
       LEFT JOIN REVIEW r ON b.booking_id = r.booking_id AND r.reviewer_user_id = ps.host_user_id
       WHERE ps.host_user_id = ?
       ORDER BY b.booking_id DESC`,
      [hostId]
    );

    return res.json({ success: true, bookings: rows });
  } catch (err) {
    console.error('Owner bookings error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load bookings' });
  }
});

// Owner Approve or Decline Pending Booking Request
router.post('/bookings/:id/decide', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const hostId = req.user!.user_id;
  const { decision, reason } = req.body; // 'approve' or 'decline'

  if (decision !== 'approve' && decision !== 'decline') {
    return res.status(400).json({ success: false, error: 'Decision must be "approve" or "decline"' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT b.booking_id, b.booking_status, ps.host_user_id
       FROM BOOKING b
       JOIN PARKING_SPACE ps ON b.space_id = ps.space_id
       WHERE b.booking_id = ? FOR UPDATE`,
      [id]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const booking = rows[0];

    if (booking.host_user_id !== hostId) {
      await connection.rollback();
      return res.status(403).json({ success: false, error: 'Unauthorized: Not the host of this space' });
    }

    if (booking.booking_status !== 'pending_approval') {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        error: `Cannot decide on booking in status "${booking.booking_status}"` 
      });
    }

    if (decision === 'approve') {
      // Transition to pending_payment with 3-minute checkout window
      await connection.execute(
        `UPDATE BOOKING SET booking_status = 'pending_payment' WHERE booking_id = ?`,
        [id]
      );
      BookingHoldManager.registerCheckoutHold(Number(id), 3);
      await connection.commit();
      return res.json({ 
        success: true, 
        message: 'Booking request approved! Driver has 3 minutes to complete payment.' 
      });
    } else {
      // Decline and release slot hold
      await connection.execute(
        `UPDATE BOOKING SET booking_status = 'declined', cancellation_reason = ? WHERE booking_id = ?`,
        [reason || 'Declined by host', id]
      );
      BookingHoldManager.clearHold(Number(id));
      await connection.commit();
      return res.json({ success: true, message: 'Booking request declined. Slot released.' });
    }

  } catch (err) {
    await connection.rollback();
    console.error('Owner decision error:', err);
    return res.status(500).json({ success: false, error: 'Failed to process decision' });
  } finally {
    connection.release();
  }
});

// Owner Request Cancellation on a Confirmed Booking (Requires Admin review)
router.post('/bookings/:id/request-cancellation', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const hostId = req.user!.user_id;
  const { reason } = req.body;

  if (!reason || reason.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'A mandatory reason is required for owner cancellation' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT b.booking_id, b.booking_status, ps.host_user_id
       FROM BOOKING b
       JOIN PARKING_SPACE ps ON b.space_id = ps.space_id
       WHERE b.booking_id = ? FOR UPDATE`,
      [id]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const booking = rows[0];

    if (booking.host_user_id !== hostId) {
      await connection.rollback();
      return res.status(403).json({ success: false, error: 'Unauthorized: Not the host of this space' });
    }

    if (booking.booking_status !== 'confirmed') {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        error: `Only confirmed bookings can have cancellation requested (current status: ${booking.booking_status})` 
      });
    }

    // Mark booking status as cancellation_requested (continues blocking until admin resolves)
    await connection.execute(
      `UPDATE BOOKING SET booking_status = 'cancellation_requested', cancellation_reason = ? WHERE booking_id = ?`,
      [`Host requested cancellation: ${reason}`, id]
    );

    // Create DISPUTE record for administrator review
    const DEMO_ADMIN_USER_ID = Number(process.env.DEMO_ADMIN_USER_ID || 1);
    await connection.execute(
      `INSERT INTO DISPUTE (
        booking_id, reporter_user_id, administrator_user_id, issue_type, description, dispute_status
      ) VALUES (?, ?, ?, 'owner_cancellation', ?, 'open')`,
      [id, hostId, DEMO_ADMIN_USER_ID, reason]
    );

    await connection.commit();

    return res.json({
      success: true,
      message: 'Cancellation request submitted to administrator. Slot remains protected until administrative resolution.'
    });

  } catch (err) {
    await connection.rollback();
    console.error('Owner cancellation request error:', err);
    return res.status(500).json({ success: false, error: 'Failed to submit cancellation request' });
  } finally {
    connection.release();
  }
});

export default router;
