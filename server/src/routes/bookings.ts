import { Router, Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { BookingHoldManager } from '../services/holdManager';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// Create Booking Request / Hold (Instant or Owner-Approved)
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const driverId = req.user!.user_id;
  const { spaceId, availabilityId, startTime, endTime } = req.body;

  if (!spaceId || !availabilityId || !startTime || !endTime) {
    return res.status(400).json({ success: false, error: 'Missing required booking fields' });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (end <= start) {
    return res.status(400).json({ success: false, error: 'End time must be strictly after start time' });
  }

  const durationHours = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60)));

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Verify space exists and is approved, lock row
    const [spaces] = await connection.execute<RowDataPacket[]>(
      `SELECT space_id, host_user_id, hourly_rate, approval_mode, listing_status 
       FROM PARKING_SPACE 
       WHERE space_id = ? FOR UPDATE`,
      [spaceId]
    );

    if (spaces.length === 0 || spaces[0].listing_status !== 'approved') {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Space is not active or available' });
    }

    const space = spaces[0];

    if (space.host_user_id === driverId) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Hosts cannot book their own parking space' });
    }

    // 2. Validate availability window belongs to this space and covers requested interval
    const [windows] = await connection.execute<RowDataPacket[]>(
      `SELECT availability_id, start_time, end_time, availability_status 
       FROM AVAILABILITY_WINDOW 
       WHERE availability_id = ? AND space_id = ? FOR UPDATE`,
      [availabilityId, spaceId]
    );

    if (windows.length === 0 || windows[0].availability_status !== 'available') {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Selected availability window is invalid or unavailable' });
    }

    const window = windows[0];
    const windowStart = new Date(window.start_time);
    const windowEnd = new Date(window.end_time);

    if (start < windowStart || end > windowEnd) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Booking interval falls outside of the host availability window' });
    }

    // 3. Concurrency check: Ensure no overlapping active booking exists
    const [overlaps] = await connection.execute<RowDataPacket[]>(
      `SELECT booking_id FROM BOOKING
       WHERE space_id = ?
         AND booking_status IN ('pending_approval', 'pending_payment', 'confirmed', 'cancellation_requested')
         AND NOT (end_time <= ? OR start_time >= ?)
       FOR UPDATE`,
      [spaceId, startTime, endTime]
    );

    if (overlaps.length > 0) {
      await connection.rollback();
      return res.status(409).json({ success: false, error: 'Slot is already held or reserved for that time' });
    }

    // 4. Calculate Authoritative Amount on Backend
    const hourlyRate = parseFloat(space.hourly_rate);
    const totalAmount = parseFloat((durationHours * hourlyRate).toFixed(2));
    const isInstant = space.approval_mode === 'instant';
    const bookingType = isInstant ? 'instant' : 'owner_approved';
    const initialStatus = isInstant ? 'pending_payment' : 'pending_approval';

    // 5. Insert Booking
    const [insertResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO BOOKING (
        space_id, driver_user_id, availability_id, start_time, end_time,
        booking_type, booking_status, amount, currency
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'INR')`,
      [spaceId, driverId, availabilityId, startTime, endTime, bookingType, initialStatus, totalAmount]
    );

    const bookingId = insertResult.insertId;

    await connection.commit();

    // 6. Register runtime timers
    if (isInstant) {
      // 3-minute payment checkout timer
      BookingHoldManager.registerCheckoutHold(bookingId, 3);
    } else {
      // Owner approval window
      const approvalDuration = space.approval_mode === 'manual_5min' ? 5 : (space.approval_mode === 'manual_10min' ? 10 : 30);
      BookingHoldManager.registerApprovalHold(bookingId, approvalDuration);
    }

    return res.status(201).json({
      success: true,
      booking: {
        booking_id: bookingId,
        space_id: spaceId,
        booking_type: bookingType,
        booking_status: initialStatus,
        amount: totalAmount,
        currency: 'INR',
        start_time: startTime,
        end_time: endTime,
        hold_seconds: isInstant ? 180 : (space.approval_mode === 'manual_5min' ? 300 : (space.approval_mode === 'manual_10min' ? 600 : 1800))
      }
    });

  } catch (err) {
    await connection.rollback();
    console.error('Booking creation error:', err);
    return res.status(500).json({ success: false, error: 'Failed to process booking hold' });
  } finally {
    connection.release();
  }
});

// Driver's Booking List
router.get('/my', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        b.booking_id,
        b.space_id,
        ps.title AS space_title,
        ps.approximate_latitude,
        ps.approximate_longitude,
        ps.access_method,
        ps.hourly_rate,
        b.start_time,
        b.end_time,
        b.booking_type,
        b.booking_status,
        b.amount,
        b.currency,
        b.cancellation_reason,
        pa.payment_status,
        pa.payment_reference,
        r.review_id AS driver_review_id
       FROM BOOKING b
       JOIN PARKING_SPACE ps ON b.space_id = ps.space_id
       LEFT JOIN PAYMENT_ATTEMPT pa ON b.booking_id = pa.booking_id
       LEFT JOIN REVIEW r ON b.booking_id = r.booking_id AND r.reviewer_user_id = b.driver_user_id
       WHERE b.driver_user_id = ?
       ORDER BY b.booking_id DESC`,
      [req.user!.user_id]
    );

    return res.json({ success: true, bookings: rows });
  } catch (err) {
    console.error('My bookings error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch bookings' });
  }
});

// Single Booking Detail
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.user_id;

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        b.booking_id,
        b.space_id,
        b.driver_user_id,
        ps.host_user_id,
        ps.title AS space_title,
        ps.hourly_rate,
        ps.access_method,
        b.start_time,
        b.end_time,
        b.booking_type,
        b.booking_status,
        b.amount,
        b.currency,
        b.cancellation_reason,
        pa.payment_status,
        pa.payment_reference
       FROM BOOKING b
       JOIN PARKING_SPACE ps ON b.space_id = ps.space_id
       LEFT JOIN PAYMENT_ATTEMPT pa ON b.booking_id = pa.booking_id
       WHERE b.booking_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const booking = rows[0];

    // Restrict access to driver, host, or admin
    if (booking.driver_user_id !== userId && booking.host_user_id !== userId && !req.user!.is_admin) {
      return res.status(403).json({ success: false, error: 'Unauthorized to view this booking' });
    }

    const remainingSecs = BookingHoldManager.getRemainingSeconds(Number(id));

    return res.json({
      success: true,
      booking: {
        ...booking,
        hold_seconds_remaining: remainingSecs
      }
    });
  } catch (err) {
    console.error('Booking detail error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch booking' });
  }
});

// Complete Simulated Payment & Confirm Booking Atomically
router.post('/:id/pay', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const driverId = req.user!.user_id;
  const { paymentMethod = 'upi' } = req.body;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Lock and verify booking
    const [bookings] = await connection.execute<RowDataPacket[]>(
      `SELECT booking_id, space_id, driver_user_id, amount, currency, booking_status, start_time, end_time
       FROM BOOKING 
       WHERE booking_id = ? FOR UPDATE`,
      [id]
    );

    if (bookings.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const booking = bookings[0];

    if (booking.driver_user_id !== driverId) {
      await connection.rollback();
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    if (booking.booking_status !== 'pending_payment') {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        error: `Cannot pay for booking in status "${booking.booking_status}". Window may have expired.` 
      });
    }

    // 2. Re-validate slot conflict before confirming
    const [conflicts] = await connection.execute<RowDataPacket[]>(
      `SELECT booking_id FROM BOOKING
       WHERE space_id = ?
         AND booking_id != ?
         AND booking_status = 'confirmed'
         AND NOT (end_time <= ? OR start_time >= ?)
       FOR UPDATE`,
      [booking.space_id, id, booking.start_time, booking.end_time]
    );

    if (conflicts.length > 0) {
      await connection.rollback();
      return res.status(409).json({ success: false, error: 'Slot conflict occurred. Payment cannot proceed.' });
    }

    // 3. Create simulated payment record
    const paymentRef = `PAY_DEMO_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    await connection.execute(
      `INSERT INTO PAYMENT_ATTEMPT (booking_id, amount, currency, payment_method, payment_status, payment_reference)
       VALUES (?, ?, ?, ?, 'successful', ?)`,
      [id, booking.amount, booking.currency, paymentMethod, paymentRef]
    );

    // 4. Update booking status to confirmed
    await connection.execute(
      `UPDATE BOOKING SET booking_status = 'confirmed' WHERE booking_id = ?`,
      [id]
    );

    // 5. Populate BOOKING_ACCESS_DETAIL from host's private location notes
    const [privateLoc] = await connection.execute<RowDataPacket[]>(
      `SELECT exact_address, private_notes FROM PRIVATE_SPACE_LOCATION WHERE space_id = ?`,
      [booking.space_id]
    );

    const accessNotes = privateLoc.length > 0 
      ? `Address: ${privateLoc[0].exact_address}. Instructions: ${privateLoc[0].private_notes || 'Proceed to designated parking bay.'}`
      : 'Access granted at designated parking bay.';

    // Release at: 1 hour before start, Expiry at: 1 hour after end
    await connection.execute(
      `INSERT INTO BOOKING_ACCESS_DETAIL (booking_id, access_instructions, release_at, expiry_at)
       VALUES (?, ?, DATE_SUB(?, INTERVAL 1 HOUR), DATE_ADD(?, INTERVAL 1 HOUR))
       ON DUPLICATE KEY UPDATE access_instructions = VALUES(access_instructions)`,
      [id, accessNotes, booking.start_time, booking.end_time]
    );

    await connection.commit();

    // Clear runtime hold timer
    BookingHoldManager.clearHold(Number(id));

    return res.json({
      success: true,
      message: 'Demo payment completed successfully. Booking is confirmed!',
      payment: {
        reference: paymentRef,
        amount: booking.amount,
        currency: booking.currency,
        status: 'successful'
      }
    });

  } catch (err) {
    await connection.rollback();
    console.error('Payment error:', err);
    return res.status(500).json({ success: false, error: 'Payment transaction failed' });
  } finally {
    connection.release();
  }
});

// Driver Cancellation (Enforces 2-hour and short-notice 2-minute rule)
router.post('/:id/cancel', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const driverId = req.user!.user_id;
  const { reason = 'Cancelled by driver' } = req.body;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [bookings] = await connection.execute<RowDataPacket[]>(
      `SELECT booking_id, driver_user_id, start_time, booking_status 
       FROM BOOKING 
       WHERE booking_id = ? FOR UPDATE`,
      [id]
    );

    if (bookings.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const booking = bookings[0];

    if (booking.driver_user_id !== driverId) {
      await connection.rollback();
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    if (booking.booking_status === 'pending_approval' || booking.booking_status === 'pending_payment') {
      // Direct cancellation of pending request/hold
      await connection.execute(
        `UPDATE BOOKING SET booking_status = 'cancelled', cancellation_reason = ? WHERE booking_id = ?`,
        [reason, id]
      );
      BookingHoldManager.clearHold(Number(id));
      await connection.commit();
      return res.json({ success: true, message: 'Booking request cancelled and slot released.' });
    }

    if (booking.booking_status === 'confirmed') {
      const now = new Date();
      const startTime = new Date(booking.start_time);
      const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      let cancellationPolicyNote = 'Standard Cancellation';

      if (hoursUntilStart >= 2) {
        cancellationPolicyNote = 'Free cancellation (>2 hours prior to arrival)';
      } else {
        cancellationPolicyNote = 'Late cancellation (<2 hours prior to arrival)';
      }

      const fullReason = `${cancellationPolicyNote} - ${reason}`;

      await connection.execute(
        `UPDATE BOOKING SET booking_status = 'cancelled', cancellation_reason = ? WHERE booking_id = ?`,
        [fullReason, id]
      );

      // Also mark payment as refunded in simulation
      await connection.execute(
        `UPDATE PAYMENT_ATTEMPT SET payment_status = 'refunded' WHERE booking_id = ?`,
        [id]
      );

      await connection.commit();
      return res.json({ success: true, message: 'Booking successfully cancelled.', policyNote: cancellationPolicyNote });
    }

    await connection.rollback();
    return res.status(400).json({ success: false, error: `Cannot cancel booking in status "${booking.booking_status}"` });

  } catch (err) {
    await connection.rollback();
    console.error('Cancellation error:', err);
    return res.status(500).json({ success: false, error: 'Failed to cancel booking' });
  } finally {
    connection.release();
  }
});

// Authorized Driver Access Instructions (Protected Post-Confirmation)
router.get('/:id/access', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const driverId = req.user!.user_id;

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        b.booking_id,
        b.driver_user_id,
        b.booking_status,
        bad.access_instructions,
        bad.release_at,
        bad.expiry_at,
        psl.exact_address,
        psl.precise_latitude,
        psl.precise_longitude,
        psl.private_notes
       FROM BOOKING b
       JOIN BOOKING_ACCESS_DETAIL bad ON b.booking_id = bad.booking_id
       JOIN PRIVATE_SPACE_LOCATION psl ON b.space_id = psl.space_id
       WHERE b.booking_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Access details not available' });
    }

    const detail = rows[0];

    // Only authorized driver or admin can view
    if (detail.driver_user_id !== driverId && !req.user!.is_admin) {
      return res.status(403).json({ success: false, error: 'Access denied: not your booking' });
    }

    if (detail.booking_status !== 'confirmed' && detail.booking_status !== 'completed') {
      return res.status(403).json({ 
        success: false, 
        error: 'Access instructions are only unlocked for confirmed, paid bookings.' 
      });
    }

    return res.json({
      success: true,
      access: {
        booking_id: detail.booking_id,
        exact_address: detail.exact_address,
        precise_latitude: detail.precise_latitude,
        precise_longitude: detail.precise_longitude,
        access_instructions: detail.access_instructions,
        private_notes: detail.private_notes,
        release_at: detail.release_at,
        expiry_at: detail.expiry_at
      }
    });

  } catch (err) {
    console.error('Access fetch error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch access instructions' });
  }
});

export default router;
