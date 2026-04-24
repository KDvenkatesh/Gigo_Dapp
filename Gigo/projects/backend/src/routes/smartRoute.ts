import { Router, Request, Response } from 'express';
import { x402PaymentMiddleware } from '../middleware/x402';
import { analyzeRoute } from '../services/groqAI';
import { getRouteOptions, getTrafficCondition } from '../services/routeService';

const router = Router();

/**
 * POST /api/smart-route
 * Protected by x402 middleware (0.0005 USDC)
 *
 * Accepts start/end coordinates, fetches route alternatives from
 * OpenRouteService, sends them to Groq AI for analysis, and returns
 * the optimal route with traffic intelligence.
 */
router.post(
  '/',
  x402PaymentMiddleware('0.0005'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { start, end } = req.body as {
        start?: { lat: number; lng: number };
        end?: { lat: number; lng: number };
      };

      if (!start?.lat || !start?.lng || !end?.lat || !end?.lng) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Missing required fields: start {lat, lng}, end {lat, lng}',
        });
        return;
      }

      // 1. Fetch route options from OpenRouteService
      const routeOptions = await getRouteOptions(start.lat, start.lng, end.lat, end.lng);

      // 2. Determine current traffic condition
      const trafficCondition = getTrafficCondition(routeOptions);

      // 3. Let AI pick the best route
      const analysis = await analyzeRoute(routeOptions, trafficCondition);
      console.log('\n[smartRoute] AI Response:', JSON.stringify(analysis, null, 2));

      // 4. Build response from the best route
      const bestIndex = Math.min(analysis.best_route_index, routeOptions.length - 1);
      const bestRoute = routeOptions[bestIndex];

      res.json({
        success: true,
        route: {
          waypoints: bestRoute.coordinates,
          estimated_minutes: analysis.estimated_minutes,
          distance_km: bestRoute.distance_km,
          traffic_status: analysis.traffic_status,
          reason: analysis.reason,
        },
      });
    } catch (error: unknown) {
      console.error('[smartRoute] Error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to compute smart route.',
      });
    }
  },
);

export default router;
