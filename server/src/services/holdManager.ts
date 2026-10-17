import { pool } from '../config/database';
import { ResultSetHeader } from 'mysql2';

interface HoldTimer {
  bookingId: number;
  timer: NodeJS.Timeout;
  expiresAt: number;
}

// In-memory store for active holds
const activeHolds = new Map<number, HoldTimer>();

export class BookingHoldManager {
  /**
   * Cleans up stale holds on server startup
   */
  static async cleanupStaleHolds(): Promise<void> {
    try {
      const [res1] = await pool.execute<ResultSetHeader>(
        `UPDATE BOOKING 
         SET booking_status = 'expired' 
         WHERE booking_status = 'pending_payment'`
      );
      if (res1.affectedRows > 0) {
        console.log(`🧹 Cleaned up ${res1.affectedRows} orphaned pending_payment bookings.`);
      }
    } catch (err) {
      console.error('Error during hold cleanup:', err);
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
          `UPDATE BOOKING 
           SET booking_status = 'expired', cancellation_reason = 'Payment hold timed out (3 min window)' 
           WHERE booking_id = ? AND booking_status = 'pending_payment'`,
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
          `UPDATE BOOKING 
           SET booking_status = 'expired', cancellation_reason = 'Host did not respond in time' 
           WHERE booking_id = ? AND booking_status = 'pending_approval'`,
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

  static getRemainingSeconds(bookingId: number): number | null {
    const existing = activeHolds.get(bookingId);
    if (!existing) return null;
    const diff = Math.floor((existing.expiresAt - Date.now()) / 1000);
    return diff > 0 ? diff : 0;
  }

  // Track confirmation timestamps in memory for 2-minute cancellation grace period
  private static confirmedAtMap = new Map<number, number>();

  static recordConfirmation(bookingId: number): void {
    this.confirmedAtMap.set(bookingId, Date.now());
  }

  static isWithinConfirmationGracePeriod(bookingId: number, graceMinutes = 2): boolean {
    const confirmedAt = this.confirmedAtMap.get(bookingId);
    if (!confirmedAt) return false;
    return (Date.now() - confirmedAt) <= graceMinutes * 60 * 1000;
  }
}
