import { Router, Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest, authenticateToken, requireAdmin } from '../middleware/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// Apply requireAdmin guard to all administrative routes
router.use(authenticateToken);
router.use(requireAdmin);

// Platform Overview Metrics
router.get('/metrics', async (req: AuthRequest, res: Response) => {
  try {
    const [spacesCount] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total_spaces,
        COUNT(CASE WHEN listing_status = 'approved' THEN 1 END) as approved_spaces,
        COUNT(CASE WHEN listing_status = 'pending_verification' THEN 1 END) as pending_spaces,
        COUNT(CASE WHEN listing_status = 'suspended' THEN 1 END) as suspended_spaces
      FROM parking_space`
    );

    const [usersCount] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN account_status = 'active' THEN 1 END) as active_users,
        COUNT(CASE WHEN account_status = 'suspended' THEN 1 END) as suspended_users
      FROM \`user\``
    );

    const [bookingsCount] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN booking_status = 'confirmed' THEN 1 END) as confirmed_bookings,
        COUNT(CASE WHEN booking_status = 'completed' THEN 1 END) as completed_bookings,
        COUNT(CASE WHEN booking_status = 'cancellation_requested' THEN 1 END) as cancellation_requests,
        COALESCE(SUM(CASE WHEN booking_status = 'completed' THEN amount ELSE 0 END), 0) as total_volume
      FROM booking`
    );

    const [disputesCount] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total_disputes,
        COUNT(CASE WHEN dispute_status = 'open' THEN 1 END) as open_disputes
      FROM dispute`
    );

    return res.json({
      success: true,
      metrics: {
        spaces: spacesCount[0],
        users: usersCount[0],
        bookings: bookingsCount[0],
        disputes: disputesCount[0]
      }
    });
  } catch (err) {
    console.error('Admin metrics error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch admin metrics' });
  }
});

// Listing Verifications (Admin review queue)
router.get('/listings', async (req: AuthRequest, res: Response) => {
  try {
    const [listings] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        ps.space_id,
        ps.title,
        ps.description,
        ps.vehicle_category,
        ps.hourly_rate,
        ps.access_method,
        ps.approval_mode,
        ps.listing_status,
        ps.approximate_latitude,
        ps.approximate_longitude,
        psl.exact_address,
        psl.precise_latitude,
        psl.precise_longitude,
        psl.private_notes,
        u.name as host_name,
        u.email as host_email,
        u.phone as host_phone,
        lv.verification_status,
        lv.decision_at
      FROM parking_space ps
      JOIN \`user\` u ON ps.host_user_id = u.user_id
      LEFT JOIN private_space_location psl ON ps.space_id = psl.space_id
      LEFT JOIN listing_verification lv ON ps.space_id = lv.space_id
       ORDER BY ps.space_id DESC`
    );

    return res.json({ success: true, listings });
  } catch (err) {
    console.error('Admin listings fetch error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load listings' });
  }
});

// Decide Listing Verification (Approve, Reject, or Request Changes)
router.post('/listings/:id/decide', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const adminId = req.user!.user_id;
  const { status } = req.body; // 'approved', 'rejected', 'changes_requested'

  if (!['approved', 'rejected', 'changes_requested'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid verification decision status' });
  }

  const spaceListingStatus = status === 'approved' ? 'approved' : (status === 'rejected' ? 'rejected' : 'pending_verification');

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Update PARKING_SPACE listing_status
    await connection.execute(
      `UPDATE parking_space SET listing_status = ? WHERE space_id = ?`,
      [spaceListingStatus, id]
    );

    // 2. Update or insert LISTING_VERIFICATION
    const [upd] = await connection.execute<ResultSetHeader>(
      `UPDATE listing_verification
       SET reviewer_user_id = ?, verification_status = ?, decision_at = NOW()
       WHERE space_id = ?`,
      [adminId, status, id]
    );

    if (upd.affectedRows === 0) {
      await connection.execute(
        `INSERT INTO listing_verification (space_id, reviewer_user_id, verification_status, decision_at)
         VALUES (?, ?, ?, NOW())`,
        [id, adminId, status]
      );
    }

    await connection.commit();

    return res.json({
      success: true,
      message: `Listing #${id} marked as ${status}. Public search visibility updated accordingly.`
    });

  } catch (err) {
    await connection.rollback();
    console.error('Listing decide error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update listing verification' });
  } finally {
    connection.release();
  }
});

// Suspend or Restore Listing (Admin safety action)
router.post('/listings/:id/status', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // 'approved' or 'suspended'

  if (status !== 'approved' && status !== 'suspended') {
    return res.status(400).json({ success: false, error: 'Status must be approved or suspended' });
  }

  try {
    await pool.execute(
      `UPDATE parking_space SET listing_status = ? WHERE space_id = ?`,
      [status, id]
    );

    return res.json({ success: true, message: `Space #${id} listing status updated to ${status}` });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to update space status' });
  }
});

// User Verification Queue
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const [users] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        u.user_id,
        u.name,
        u.email,
        u.phone,
        u.account_status,
        u.created_at,
        uv.verification_id,
        uv.verification_type,
        uv.verification_status,
        uv.verified_at
      FROM \`user\` u
      LEFT JOIN user_verification uv ON u.user_id = uv.user_id
       ORDER BY u.user_id DESC`
    );

    return res.json({ success: true, users });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to load users' });
  }
});

// Approve or Reject User Verification
router.post('/users/:id/verify', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, type = 'phone_otp' } = req.body; // 'verified' or 'rejected'

  if (status !== 'verified' && status !== 'rejected') {
    return res.status(400).json({ success: false, error: 'Status must be verified or rejected' });
  }
  if (!['phone_otp', 'email_confirmation'].includes(type)) {
    return res.status(400).json({ success: false, error: 'Unsupported verification type' });
  }

  try {
    const [upd] = await pool.execute<ResultSetHeader>(
      `UPDATE user_verification
       SET verification_type = ?, verification_status = ?, verified_at = NOW()
       WHERE user_id = ?`,
      [type, status, id]
    );

    if (upd.affectedRows === 0) {
      await pool.execute(
        `INSERT INTO user_verification (user_id, verification_type, verification_status, verified_at)
         VALUES (?, ?, ?, NOW())`,
        [id, type, status]
      );
    }

    return res.json({ success: true, message: `User verification updated to ${status}` });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to update user verification' });
  }
});

// Suspend or Activate User Account
router.post('/users/:id/status', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // 'active' or 'suspended'

  if (status !== 'active' && status !== 'suspended') {
    return res.status(400).json({ success: false, error: 'Status must be active or suspended' });
  }

  try {
    await pool.execute(
      `UPDATE \`user\` SET account_status = ? WHERE user_id = ?`,
      [status, id]
    );

    return res.json({ success: true, message: `User #${id} account status set to ${status}` });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to update user status' });
  }
});

// Disputes & Owner Cancellation Requests Review
router.get('/disputes', async (req: AuthRequest, res: Response) => {
  try {
    const [disputes] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        d.dispute_id,
        d.booking_id,
        d.reporter_user_id,
        reporter.name as reporter_name,
        reporter.email as reporter_email,
        d.administrator_user_id,
        d.issue_type,
        d.description,
        d.dispute_status,
        d.resolution,
        b.space_id,
        b.booking_status,
        b.amount,
        b.start_time,
        b.end_time,
        ps.title as space_title
      FROM dispute d
      JOIN booking b ON d.booking_id = b.booking_id
      JOIN parking_space ps ON b.space_id = ps.space_id
      JOIN \`user\` reporter ON d.reporter_user_id = reporter.user_id
       ORDER BY d.dispute_id DESC`
    );

    return res.json({ success: true, disputes });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to load disputes' });
  }
});

// Resolve Dispute or Owner-Requested Cancellation
router.post('/disputes/:id/resolve', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const adminId = req.user!.user_id;
  const { resolution, approveCancellation } = req.body;

  if (!resolution || resolution.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Resolution details are required' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [disputes] = await connection.execute<RowDataPacket[]>(
      `SELECT d.dispute_id, d.booking_id, d.issue_type, b.booking_status 
      FROM dispute d
      JOIN booking b ON d.booking_id = b.booking_id
       WHERE d.dispute_id = ? FOR UPDATE`,
      [id]
    );

    if (disputes.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Dispute not found' });
    }

    const dispute = disputes[0];

    // If this was an owner cancellation request
    if (dispute.issue_type === 'owner_cancellation') {
      if (approveCancellation) {
        // Mark booking cancelled and release slot
        await connection.execute(
          `UPDATE booking SET booking_status = 'cancelled', cancellation_reason = ? WHERE booking_id = ?`,
          [`Admin approved host cancellation: ${resolution}`, dispute.booking_id]
        );
        // Refund payment
        await connection.execute(
          `UPDATE payment_attempt SET payment_status = 'refunded' WHERE booking_id = ?`,
          [dispute.booking_id]
        );
      } else {
        // Retain / restore confirmed booking
        await connection.execute(
          `UPDATE booking SET booking_status = 'confirmed', cancellation_reason = NULL WHERE booking_id = ?`,
          [dispute.booking_id]
        );
      }
    }

    // Update DISPUTE record
    await connection.execute(
      `UPDATE dispute
       SET administrator_user_id = ?, dispute_status = 'resolved', resolution = ? 
       WHERE dispute_id = ?`,
      [adminId, resolution, id]
    );

    await connection.commit();

    return res.json({
      success: true,
      message: 'Dispute resolved successfully'
    });

  } catch (err) {
    await connection.rollback();
    console.error('Resolve dispute error:', err);
    return res.status(500).json({ success: false, error: 'Failed to resolve dispute' });
  } finally {
    connection.release();
  }
});

export default router;
