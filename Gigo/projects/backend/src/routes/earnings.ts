import { Router, Request, Response } from 'express';
import { x402PaymentMiddleware } from '../middleware/x402';
import { analyzeDriverEarnings } from '../services/groqAI';

const router = Router();

/**
 * POST /api/earnings-insight
 * Protected by x402 middleware (0.002 USDC)
 *
 * Accepts a driver's ride history for the week and returns
 * AI-powered earnings insights and optimization tips.
 */
router.post(
  '/',
  x402PaymentMiddleware('0.002'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { driver_id, rides_this_week } = req.body as {
        driver_id?: string;
        rides_this_week?: Array<{
          ride_id: string;
          pickup: string;
          drop: string;
          fare: number;
          time: string;
          duration_minutes: number;
        }>;
      };

      if (!driver_id) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Missing required field: driver_id',
        });
        return;
      }

      const ridesData = rides_this_week ?? [];
      const insight = await analyzeDriverEarnings(ridesData);
      console.log('\n[earnings] AI Response:', JSON.stringify(insight, null, 2));

      res.json({
        success: true,
        driver_id,
        insight,
      });
    } catch (error: unknown) {
      console.error('[earnings] Error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to generate earnings insight.',
      });
    }
  },
);

export default router;
