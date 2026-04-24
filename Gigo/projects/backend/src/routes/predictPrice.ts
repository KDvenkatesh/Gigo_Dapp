import { Router, Request, Response } from 'express';
import { x402PaymentMiddleware } from '../middleware/x402';
import { predictSurgeFare } from '../services/groqAI';

const router = Router();

/**
 * POST /api/predict-price
 * Protected by x402 middleware (0.001 USDC)
 *
 * Accepts pickup, destination, current_time, base_fare and returns
 * an AI-powered surge fare prediction.
 */
router.post(
  '/',
  x402PaymentMiddleware('0.001'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { pickup, destination, current_time, base_fare } = req.body as {
        pickup?: string;
        destination?: string;
        current_time?: string;
        base_fare?: number;
      };

      if (!pickup || !destination || !current_time || base_fare === undefined) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Missing required fields: pickup, destination, current_time, base_fare',
        });
        return;
      }

      const prediction = await predictSurgeFare(pickup, destination, current_time, base_fare);
      console.log('\n[predictPrice] AI Response:', JSON.stringify(prediction, null, 2));

      res.json({
        success: true,
        prediction,
      });
    } catch (error: unknown) {
      console.error('[predictPrice] Error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to generate fare prediction.',
      });
    }
  },
);

export default router;
