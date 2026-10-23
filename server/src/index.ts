import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';

import { testConnection } from './config/database';
import { BookingHoldManager } from './services/holdManager';

import authRoutes from './routes/auth';
import spacesRoutes from './routes/spaces';
import bookingsRoutes from './routes/bookings';
import ownerRoutes from './routes/owner';
import reviewsRoutes from './routes/reviews';
import disputesRoutes from './routes/disputes';
import adminRoutes from './routes/admin';

const app = express();
const PORT = env.port;

// CORS configuration allowing React frontend with credentials
app.use(cors({
  origin: env.clientUrl || false,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api', (_req, _res, next) => {
  BookingHoldManager.expireStaleHolds().finally(next);
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Parko API', time: new Date().toISOString() });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/spaces', spacesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/disputes', disputesRoutes);
app.use('/api/admin', adminRoutes);

// Centralized error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled API Error:', err);
  res.status(500).json({ success: false, error: 'Internal server error occurred' });
});

// Start Server & Initialize Database
async function startServer() {
  try {
    await testConnection();
    app.listen(PORT, () => {
      console.log(`🚀 Parko API Server running on port ${PORT}`);
      console.log(`🌐 Accessible at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
