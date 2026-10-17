import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { RowDataPacket } from 'mysql2';

const router = Router();

// Public Parking Search
// CRITICAL: NEVER joins or returns PRIVATE_SPACE_LOCATION
router.get('/search', async (req: Request, res: Response) => {
  try {
    const {
      cityId = 1,
      vehicleCategory,
      maxPrice,
      approvalMode,
      minRating
    } = req.query;

    let query = `
      SELECT 
        ps.space_id,
        ps.title,
        ps.description,
        ps.vehicle_category,
        ps.hourly_rate,
        ps.access_method,
        ps.approval_mode,
        ps.approximate_latitude,
        ps.approximate_longitude,
        c.city_name,
        c.currency,
        u.name AS host_name,
        COALESCE(ROUND(AVG(r.rating), 1), 0.0) AS average_rating,
        COUNT(DISTINCT r.review_id) AS total_reviews,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM BOOKING b2 
            WHERE b2.space_id = ps.space_id 
              AND b2.booking_status IN ('pending_approval', 'pending_payment')
              AND NOW() BETWEEN b2.start_time AND b2.end_time
          ) THEN 'pending_hold'
          WHEN EXISTS (
            SELECT 1 FROM AVAILABILITY_WINDOW aw 
            WHERE aw.space_id = ps.space_id 
              AND aw.availability_status = 'available'
              AND NOW() BETWEEN aw.start_time AND aw.end_time
              AND NOT EXISTS (
                SELECT 1 FROM BOOKING b3 
                WHERE b3.space_id = ps.space_id 
                  AND b3.booking_status IN ('confirmed', 'cancellation_requested')
                  AND NOW() BETWEEN b3.start_time AND b3.end_time
              )
          ) THEN 'available_now'
          WHEN EXISTS (
            SELECT 1 FROM AVAILABILITY_WINDOW aw 
            WHERE aw.space_id = ps.space_id 
              AND aw.availability_status = 'available'
              AND aw.start_time BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 15 MINUTE)
          ) THEN 'available_soon'
          ELSE 'unavailable'
        END AS availability_state
      FROM PARKING_SPACE ps
      JOIN CITY c ON ps.city_id = c.city_id
      JOIN USER u ON ps.host_user_id = u.user_id
      LEFT JOIN BOOKING b ON ps.space_id = b.space_id
      LEFT JOIN REVIEW r ON b.booking_id = r.booking_id AND r.reviewed_user_id = ps.host_user_id
      WHERE ps.listing_status = 'approved' AND u.account_status = 'active'
    `;

    const params: any[] = [];

    if (cityId) {
      query += ' AND ps.city_id = ?';
      params.push(cityId);
    }

    if (vehicleCategory && vehicleCategory !== 'all') {
      query += ' AND (ps.vehicle_category = ? OR ps.vehicle_category = "all")';
      params.push(vehicleCategory);
    }

    if (maxPrice) {
      query += ' AND ps.hourly_rate <= ?';
      params.push(Number(maxPrice));
    }

    if (approvalMode) {
      query += ' AND ps.approval_mode = ?';
      params.push(approvalMode);
    }

    query += ' GROUP BY ps.space_id, c.city_id, u.user_id';

    if (minRating) {
      query += ' HAVING average_rating >= ?';
      params.push(Number(minRating));
    }

    query += ' ORDER BY ps.hourly_rate ASC';

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);

    return res.json({
      success: true,
      count: rows.length,
      spaces: rows
    });
  } catch (err) {
    console.error('Space search error:', err);
    return res.status(500).json({ success: false, error: 'Failed to search parking spaces' });
  }
});

// Single Public Space Detail (Privacy Preserved)
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        ps.space_id,
        ps.host_user_id,
        ps.title,
        ps.description,
        ps.vehicle_category,
        ps.hourly_rate,
        ps.access_method,
        ps.approval_mode,
        ps.listing_status,
        ps.approximate_latitude,
        ps.approximate_longitude,
        c.city_name,
        c.currency,
        u.name AS host_name,
        COALESCE(ROUND(AVG(r.rating), 1), 0.0) AS average_rating,
        COUNT(r.review_id) AS total_reviews
      FROM PARKING_SPACE ps
      JOIN CITY c ON ps.city_id = c.city_id
      JOIN USER u ON ps.host_user_id = u.user_id
      LEFT JOIN BOOKING b ON ps.space_id = b.space_id
      LEFT JOIN REVIEW r ON b.booking_id = r.booking_id AND r.reviewed_user_id = ps.host_user_id
      WHERE ps.space_id = ? AND ps.listing_status = 'approved'
      GROUP BY ps.space_id, c.city_id, u.user_id`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Parking space not found or not currently active' });
    }

    return res.json({ success: true, space: rows[0] });
  } catch (err) {
    console.error('Space detail error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load parking space' });
  }
});

// Space Availability Windows
router.get('/:id/availability', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const [windows] = await pool.execute<RowDataPacket[]>(
      `SELECT availability_id, space_id, start_time, end_time, availability_status
       FROM AVAILABILITY_WINDOW
       WHERE space_id = ? AND end_time >= NOW() AND availability_status = 'available'
       ORDER BY start_time ASC`,
      [id]
    );

    // Also fetch blocking active bookings for this space to indicate unavailable slots
    const [blockingBookings] = await pool.execute<RowDataPacket[]>(
      `SELECT booking_id, start_time, end_time, booking_status
       FROM BOOKING
       WHERE space_id = ? 
         AND end_time >= NOW()
         AND booking_status IN ('pending_approval', 'pending_payment', 'confirmed', 'cancellation_requested')
       ORDER BY start_time ASC`,
      [id]
    );

    return res.json({
      success: true,
      windows,
      blockingBookings
    });
  } catch (err) {
    console.error('Availability fetch error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch availability' });
  }
});

// Protected Pre-booking Route Preview (Explicitly requires authentication)
// Discloses destination route line/coordinates for map routing, NOT text address or gate codes!
router.get('/:id/route-preview', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT ps.space_id, ps.title, psl.precise_latitude, psl.precise_longitude
       FROM PARKING_SPACE ps
       JOIN PRIVATE_SPACE_LOCATION psl ON ps.space_id = psl.space_id
       WHERE ps.space_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Space not found' });
    }

    const item = rows[0];

    return res.json({
      success: true,
      routePreview: {
        space_id: item.space_id,
        title: item.title,
        destination_lat: item.precise_latitude,
        destination_lng: item.precise_longitude,
        note: 'Destination coordinate provided exclusively for map route display.'
      }
    });
  } catch (err) {
    console.error('Route preview error:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate route preview' });
  }
});

export default router;
