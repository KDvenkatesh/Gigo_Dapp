import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import predictPriceRouter from './routes/predictPrice';
import smartRouteRouter from './routes/smartRoute';
import earningsRouter from './routes/earnings';
import storageRouter from './routes/storage';
import ridesRouter from './routes/rides';
import topupRouter from './routes/topup';
import passesRouter from './routes/passes';
import customersRouter from './routes/customers';
import mongoose from 'mongoose';


const app = express();
const PORT = Number(process.env.PORT) || 3001;
const MONGODB_URI = process.env.MONGODB_URI?.trim();

if (process.env.NODE_ENV !== 'test') {
  if (!MONGODB_URI) {
    console.error('❌ CRITICAL: MONGODB_URI environment variable is not defined!');
  } else {
    mongoose.connect(MONGODB_URI)
      .then(() => console.log('✅ Connected to MongoDB'))
      .catch((err) => {
        console.error('❌ MongoDB connection error:', err);
        if (err.name === 'MongoParseError') {
          console.error('👉 TIP: Check if your MONGODB_URI starts with "mongodb://" or "mongodb+srv://" in your environment variables.');
        }
      });
  }
}

/* ── CORS ── */
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:3000',
      'https://gigo-dapp.vercel.app',
      'https://gigo-app.vercel.app',
      'https://gigo-dapp.onrender.com',
      /\.vercel\.app$/, // Allow all vercel subdomains
      /\.onrender\.com$/, // Allow all render subdomains
    ],
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-PAYMENT'],
  }),
);

/* ── Body parsers ── */
app.use(express.json({ limit: '10mb' }));

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
app.use('/api/storage', storageRouter);
app.use('/api/rides', ridesRouter);
app.use('/api/topup', topupRouter);
app.use('/api/passes', passesRouter);
app.use('/api/customers', customersRouter);

/* ── 404 fallback ── */
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

/* ── Start server ── */
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n🚀 Gigo AI Backend running on http://localhost:${PORT}`);
    console.log(`   Health:   http://localhost:${PORT}/health`);
    console.log(`   Routes:   /api/predict-price`);
    console.log(`             /api/smart-route`);
    console.log(`             /api/earnings-insight\n`);
  });
}

export default app;
