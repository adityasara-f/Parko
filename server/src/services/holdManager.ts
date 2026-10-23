import { pool } from '../config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

interface HoldTimer {
  bookingId: number;
  timer: NodeJS.Timeout;
  expiresAt: number;
}

// In-memory store for active holds
const activeHolds = new Map<number, HoldTimer>();

export class BookingHoldManager {
  static async expireStaleHolds(): Promise<void> {
    try {
      const [result] = await pool.execute<ResultSetHeader>(
        `UPDATE booking
         SET cancellation_reason = CASE
               WHEN booking_status = 'pending_payment' THEN 'Payment hold expired'
               ELSE 'Host approval window expired'
             END,
             booking_status = 'expired',
             hold_expires_at = NULL
         WHERE booking_status IN ('pending_payment', 'pending_approval')
           AND hold_expires_at IS NOT NULL
           AND hold_expires_at <= NOW()`
      );
      if (result.affectedRows > 0) {
        console.log(`Expired ${result.affectedRows} booking holds.`);
      }
    } catch (err) {
      console.error('Error expiring stale booking holds:', err);
    }
  }

  /**
   * Registers a 3-minute payment checkout timer
   */
  static registerCheckoutHold(bookingId: number, durationMinutes = 3): void {
    this.clearHold(bookingId);

    const ms = durationMinutes * 60 * 1000;
    const expiresAt = Date.now() + ms;

    const timer = setTimeout(async () => {
      try {
        await pool.execute(
          `UPDATE booking
           SET booking_status = 'expired', cancellation_reason = 'Payment hold expired', hold_expires_at = NULL
           WHERE booking_id = ? AND booking_status = 'pending_payment' AND hold_expires_at <= NOW()`,
          [bookingId]
        );
        console.log(`⏰ Checkout hold expired for booking #${bookingId}`);
      } catch (err) {
        console.error(`Failed to expire booking #${bookingId}:`, err);
      } finally {
        activeHolds.delete(bookingId);
      }
    }, ms);

    activeHolds.set(bookingId, { bookingId, timer, expiresAt });
  }

  /**
   * Registers an owner approval timer (5, 10, or 30 minutes)
   */
  static registerApprovalHold(bookingId: number, durationMinutes: number): void {
    this.clearHold(bookingId);

    const ms = durationMinutes * 60 * 1000;
    const expiresAt = Date.now() + ms;

    const timer = setTimeout(async () => {
      try {
        await pool.execute(
          `UPDATE booking
           SET booking_status = 'expired', cancellation_reason = 'Host approval window expired', hold_expires_at = NULL
           WHERE booking_id = ? AND booking_status = 'pending_approval' AND hold_expires_at <= NOW()`,
          [bookingId]
        );
        console.log(`⏰ Approval window expired for booking #${bookingId}`);
      } catch (err) {
        console.error(`Failed to expire approval for booking #${bookingId}:`, err);
      } finally {
        activeHolds.delete(bookingId);
      }
    }, ms);

    activeHolds.set(bookingId, { bookingId, timer, expiresAt });
  }

  /**
   * Clears a hold timer when confirmed, paid, cancelled or declined
   */
  static clearHold(bookingId: number): void {
    const existing = activeHolds.get(bookingId);
    if (existing) {
      clearTimeout(existing.timer);
      activeHolds.delete(bookingId);
    }
  }

  static async getRemainingSeconds(bookingId: number): Promise<number | null> {
    interface RemainingHoldRow extends RowDataPacket {
      remaining_seconds: number | null;
    }
    const [rows] = await pool.execute<RemainingHoldRow[]>(
      `SELECT GREATEST(TIMESTAMPDIFF(SECOND, NOW(), hold_expires_at), 0) AS remaining_seconds
       FROM booking
       WHERE booking_id = ? AND booking_status IN ('pending_payment', 'pending_approval')`,
      [bookingId]
    );
    return rows.length > 0 && rows[0].remaining_seconds !== null
      ? Number(rows[0].remaining_seconds)
      : null;
  }
}
