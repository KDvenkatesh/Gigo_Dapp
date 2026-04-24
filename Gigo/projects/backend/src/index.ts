import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import predictPriceRouter from './routes/predictPrice';
import smartRouteRouter from './routes/smartRoute';
import earningsRouter from './routes/earnings';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

/* ── CORS ── */
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://gigo-dapp.vercel.app',
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-PAYMENT'],
  }),
);

/* ── Body parsers ── */
app.use(express.json({ limit: '1mb' }));

/* ── Health check ── */
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Gigo AI Backend',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

/* ── API Routes ── */
app.use('/api/predict-price', predictPriceRouter);
app.use('/api/smart-route', smartRouteRouter);
app.use('/api/earnings-insight', earningsRouter);

/* ── 404 fallback ── */
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

/* ── Start server ── */
app.listen(PORT, () => {
  console.log(`\n🚀 Gigo AI Backend running on http://localhost:${PORT}`);
  console.log(`   Health:   http://localhost:${PORT}/health`);
  console.log(`   Routes:   /api/predict-price`);
  console.log(`             /api/smart-route`);
  console.log(`             /api/earnings-insight\n`);
});

export default app;
