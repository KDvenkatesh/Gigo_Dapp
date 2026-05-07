import Groq from 'groq-sdk';

/* ── Initialise Groq client ── */
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY ?? '',
});

const MODEL = 'llama-3.3-70b-versatile';

/* ── Type definitions ── */
export interface SurgeFarePrediction {
  current_time_analysis: string;
  traffic_details: string;
  current_fare: number;
  fare_10min: number;
  fare_30min: number;
  surge_multiplier: number;
  recommendation: 'BOOK_NOW' | 'WAIT' | 'NEUTRAL';
  reason: string;
  confidence: number;
}

export interface RouteAnalysis {
  best_route_index: number;
  estimated_minutes: number;
  traffic_status: 'CLEAR' | 'MODERATE' | 'HEAVY';
  reason: string;
}

export interface EarningsInsight {
  total_earnings_algo: number;
  completed_rides: number;
  average_fare: number;
  total_distance_km: number;
  hotspots: Array<{ name: string; demand_level: 'HIGH' | 'MEDIUM' | 'LOW' }>;
  driving_strategy: string;
}

/* ── Helpers ── */

/**
 * Strip markdown code-fence wrappers that LLMs occasionally add
 * around JSON responses, then parse the JSON.
 */
function safeParseJSON<T>(raw: string): T {
  let cleaned = raw.trim();

  // Remove ```json ... ``` or ``` ... ``` wrappers
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  // If the model still returned extra text, extract the first JSON object
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  return JSON.parse(cleaned) as T;
}

/* ── Function 1: Surge Fare Prediction ── */
export async function predictSurgeFare(
  pickup: string,
  destination: string,
  time: string,
  baseFare: number,
): Promise<SurgeFarePrediction> {
  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a fare prediction AI for Gigo ride sharing in India. Analyze location, time, day of week. Predict fare surge in next 10 and 30 minutes. Consider Indian office hours 8-10am 5-8pm, weekends, festivals, rain. All fares are in ALGO cryptocurrency. RESPOND IN JSON ONLY. No extra text.

Return this exact JSON shape:
{
  "current_time_analysis": "<short analysis of the given time/day>",
  "traffic_details": "<short estimate of current traffic conditions between pickup and destination>",
  "current_fare": <MUST equal the provided Base Fare exactly>,
  "fare_10min": <number>,
  "fare_30min": <number>,
  "surge_multiplier": <number between 1.0 and 3.0>,
  "recommendation": "BOOK_NOW" | "WAIT" | "NEUTRAL",
  "reason": "<short explanation>",
  "confidence": <number between 0 and 100>
}`,
        },
        {
          role: 'user',
          content: `Pickup: ${pickup}\nDestination: ${destination}\nCurrent Time: ${time}\nBase Fare: ${baseFare} ALGO`,
        },
      ],
      temperature: 0.3,
      max_tokens: 512,
    });

    const content = completion.choices[0]?.message?.content ?? '';
    const parsed = safeParseJSON<SurgeFarePrediction>(content);

    // Guarantee the two new fields are always present
    return {
      current_time_analysis: parsed.current_time_analysis || `Analyzing time context for ${time}`,
      traffic_details: parsed.traffic_details || 'Traffic estimate unavailable',
      current_fare: parsed.current_fare ?? baseFare,
      fare_10min: parsed.fare_10min ?? baseFare,
      fare_30min: parsed.fare_30min ?? baseFare,
      surge_multiplier: parsed.surge_multiplier ?? 1.0,
      recommendation: parsed.recommendation ?? 'NEUTRAL',
      reason: parsed.reason ?? '',
      confidence: parsed.confidence ?? 0,
    };
  } catch (error: unknown) {
    console.error('[groqAI] predictSurgeFare error:', error);

    // Graceful fallback so the frontend always gets valid data
    return {
      current_time_analysis: 'Unable to analyze time.',
      traffic_details: 'Unable to analyze traffic.',
      current_fare: baseFare,
      fare_10min: baseFare,
      fare_30min: baseFare,
      surge_multiplier: 1.0,
      recommendation: 'NEUTRAL',
      reason: 'Unable to predict surge — using base fare.',
      confidence: 0,
    };
  }
}

/* ── Function 2: Route Analysis ── */
export async function analyzeRoute(
  routeOptions: Array<{
    coordinates: Array<{ lat: number; lng: number }>;
    distance_km: number;
    duration_minutes: number;
    traffic_delay_seconds: number;
  }>,
  trafficData: string,
): Promise<RouteAnalysis> {
  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a route AI for Indian ride sharing. Given route options and traffic data, pick the best. Consider: time, distance, congestion in Indian cities. RESPOND IN JSON ONLY. No extra text.

Return this exact JSON shape:
{
  "best_route_index": <number, 0-indexed>,
  "estimated_minutes": <number>,
  "traffic_status": "CLEAR" | "MODERATE" | "HEAVY",
  "reason": "<short explanation>"
}`,
        },
        {
          role: 'user',
          content: `Route Options:\n${JSON.stringify(routeOptions, null, 2)}\n\nTraffic Data: ${trafficData}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 512,
    });

    const content = completion.choices[0]?.message?.content ?? '';
    return safeParseJSON<RouteAnalysis>(content);
  } catch (error: unknown) {
    console.error('[groqAI] analyzeRoute error:', error);

    return {
      best_route_index: 0,
      estimated_minutes: routeOptions[0]?.duration_minutes ?? 15,
      traffic_status: 'MODERATE',
      reason: 'Unable to analyze routes — defaulting to first option.',
    };
  }
}

/* ── Function 3: Driver Earnings Analysis ── */
export async function analyzeDriverEarnings(
  ridesData: Array<{
    ride_id: string;
    pickup: string;
    drop: string;
    fare: number;
    distance_km?: number;
    time: string;
    duration_minutes: number;
  }>,
): Promise<EarningsInsight> {
  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an earnings optimizer for Indian ride-share drivers using ALGO cryptocurrency. Analyze ride history. Calculate totals and provide actionable strategies. RESPOND IN JSON ONLY. No extra text.

Return this exact JSON shape:
{
  "total_earnings_algo": <sum of all fares>,
  "completed_rides": <count of rides>,
  "average_fare": <total / count>,
  "total_distance_km": <sum of all distance_km>,
  "hotspots": [{"name": "<area name>", "demand_level": "HIGH" | "MEDIUM" | "LOW"}],
  "driving_strategy": "<2-3 sentence actionable strategy>"
}`,
        },
        {
          role: 'user',
          content: `Driver Ride History (this week):\n${JSON.stringify(ridesData, null, 2)}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 512,
    });

    const content = completion.choices[0]?.message?.content ?? '';
    return safeParseJSON<EarningsInsight>(content);
  } catch (error: unknown) {
    console.error('[groqAI] analyzeDriverEarnings error:', error);

    // Calculate basic totals for fallback
    const completed = ridesData.length;
    const totalEarnings = ridesData.reduce((sum, r) => sum + r.fare, 0);
    const totalDistance = ridesData.reduce((sum, r) => sum + (r.distance_km ?? 0), 0);

    return {
      total_earnings_algo: totalEarnings,
      completed_rides: completed,
      average_fare: completed > 0 ? totalEarnings / completed : 0,
      total_distance_km: totalDistance,
      hotspots: [
        { name: 'City Center', demand_level: 'HIGH' },
        { name: 'Railway Station', demand_level: 'MEDIUM' },
      ],
      driving_strategy: 'Continue providing excellent service. Demand is peak during office hours.',
    };
  }
}
