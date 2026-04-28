import 'express-async-errors';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler.js';
import apiRouter from './routes/index.js';
import { processNotifications, startNotificationWorker } from './workers/notificationWorker.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.set('trust proxy', 1);

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Vercel Cron Endpoint
app.get('/api/cron/notifications', async (req, res) => {
  // Simple check to ensure this is called by Vercel Cron
  // If CRON_SECRET is set in Vercel env, check it
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await processNotifications();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/api', apiRouter);

app.use(errorHandler);

// For local development
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startNotificationWorker();
  });
}

export default app;

