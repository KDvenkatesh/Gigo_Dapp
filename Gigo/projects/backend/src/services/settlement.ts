import { IRide } from '../models/Ride';
import crypto from 'crypto';
import fetch from 'node-fetch'; // Requires node-fetch if Node < 18, but assuming Node 18+ global fetch works, or axios. Actually, let's use global fetch (Node 18+).

const MICRO_ALGOS_PER_GIGC = 1000000;
const WAIT_TIME_GRACE_PERIOD_MS = 3 * 60 * 1000;
const WAIT_TIME_FEE_PER_MIN_MICRO = 1 * MICRO_ALGOS_PER_GIGC;

const TRAFFIC_DELAY_GRACE_PERIOD_MS = 10 * 60 * 1000;
const TRAFFIC_DELAY_FEE_PER_MIN_MICRO = 0.5 * MICRO_ALGOS_PER_GIGC;
const MAX_TRAFFIC_DELAY_FEE_MICRO = 30 * MICRO_ALGOS_PER_GIGC;

const WEATHER_API_KEY = process.env.WEATHER_API_KEY || '';

export class SettlementService {
    
    /**
     * Calculate Weather Surge Multiplier
     * Minimum 1.0 (100), Maximum 2.5 (250).
     */
    static async getWeatherSurgeMultiplier(lat: number, lng: number): Promise<number> {
        try {
            if (!WEATHER_API_KEY) {
               // Demo mode simulation if no API key is provided
               const hour = new Date().getHours();
               return (hour >= 18 || hour <= 6) ? 1.2 : 1.0; // Surge at night/evening
            }
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${WEATHER_API_KEY}`;
            // Use global fetch
            const response = await fetch(url);
            if (!response.ok) return 1.0;
            const data = await response.json();
            
            const condition = data.weather?.[0]?.main?.toLowerCase() || data.weather?.[0]?.description?.toLowerCase() || '';
            const precip_mm = data.rain?.['1h'] || 0;

            let multiplier = 1.0;
            if (condition.includes('storm') || condition.includes('hurricane') || condition.includes('thunderstorm') || precip_mm > 10) {
                multiplier = 2.0;
            } else if (condition.includes('heavy rain') || precip_mm > 5) {
                multiplier = 1.8;
            } else if (condition.includes('rain') || condition.includes('drizzle')) {
                multiplier = 1.2;
            }

            // Clamp between 1.0 and 2.5
            return Math.max(1.0, Math.min(multiplier, 2.5));
        } catch (error) {
            console.warn("⚠️ [Weather API Fallback] Service unavailable or timeout. Using default multiplier = 1.0. Error:", error);
            return 1.0;
        }
    }

    /**
     * Calculate Wait Time Fee
     * 3-minute grace period, then 1 GIGC per minute.
     */
    static calculateWaitTimeFee(driverArrivalAt: Date | undefined, rideStartedAt: Date | undefined): number {
        if (!driverArrivalAt || !rideStartedAt) return 0;
        const waitTimeMs = rideStartedAt.getTime() - driverArrivalAt.getTime();
        if (waitTimeMs <= WAIT_TIME_GRACE_PERIOD_MS) return 0;

        const billableWaitTimeMs = waitTimeMs - WAIT_TIME_GRACE_PERIOD_MS;
        const billableMinutes = Math.ceil(billableWaitTimeMs / (60 * 1000));
        return billableMinutes * WAIT_TIME_FEE_PER_MIN_MICRO;
    }

    /**
     * Calculate Traffic Delay Fee
     * 10-minute grace period, then 0.5 GIGC per minute, max 30 GIGC.
     */
    static calculateTrafficDelayFee(estimatedDurationMs: number, actualDurationMs: number): number {
        const delayMs = actualDurationMs - estimatedDurationMs;
        if (delayMs <= TRAFFIC_DELAY_GRACE_PERIOD_MS) return 0;

        const billableDelayMs = delayMs - TRAFFIC_DELAY_GRACE_PERIOD_MS;
        const billableMinutes = Math.ceil(billableDelayMs / (60 * 1000));
        const fee = billableMinutes * TRAFFIC_DELAY_FEE_PER_MIN_MICRO;
        
        return Math.min(fee, MAX_TRAFFIC_DELAY_FEE_MICRO);
    }

    /**
     * Proportional Refund & Progress Validation
     * Progress = distance_travelled / estimated_total_distance. Clamped between 0 and 1.
     */
    static calculateProgress(distanceTravelledKm: number, estimatedTotalDistanceKm: number): number {
        if (estimatedTotalDistanceKm <= 0) return 1.0; // Avoid division by zero
        if (distanceTravelledKm < 0) return 0.0;
        
        const progress = distanceTravelledKm / estimatedTotalDistanceKm;
        return Math.max(0, Math.min(progress, 1.0));
    }

    /**
     * Calculate Final Customer Cancel Split (Customer partial refund, Driver partial payment)
     */
    static haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    static calculateCustomerCancelSplit(ride: IRide, distanceTravelledKm: number) {
        let est = ride.estimatedDistanceKm;
        if (!est && ride.pickup && ride.drop) {
            est = this.haversineKm(ride.pickup.lat, ride.pickup.lng, ride.drop.lat, ride.drop.lng);
        }
        if (!est || est <= 0) est = 1; // Fallback to avoid division by zero
        
        const progress = this.calculateProgress(distanceTravelledKm, est);
        
        const totalFare = parseInt(ride.fareMicroAlgos, 10);
        
        const driverAmount = Math.floor(totalFare * progress);
        const customerAmount = totalFare - driverAmount;
        
        return { driverAmount, customerAmount, progress };
    }

    /**
     * Idempotency & Trust Checks
     */
    static validateStateForSettlement(ride: IRide, driverAmount: number, customerAmount: number, totalFare: number) {
        if (ride.settlementTxId) {
            throw new Error("Ride already settled (Duplicate settlement request)");
        }
        if (ride.status === 'Completed' || ride.status === 'Cancelled' || ride.status === 'CANCELLED') {
            throw new Error("Ride is already finalized");
        }
        if (driverAmount < 0 || customerAmount < 0) {
            throw new Error("Payout amounts cannot be negative");
        }
        if (driverAmount + customerAmount > totalFare) {
            throw new Error(`Total settlement amount (${driverAmount + customerAmount}) exceeds escrowed fare (${totalFare})`);
        }
    }

    /**
     * Generate Ride Receipt Hash for Web3 verification
     */
    static generateReceiptHash(
        ride: IRide, 
        driverPayout: number, 
        customerRefund: number, 
        waitFee: number, 
        trafficFee: number, 
        weatherMultiplier: number,
        settlementReason: string,
        presenceEvidence: string[] = []
    ): { receipt: any, hash: string } {
        const receipt = {
            rideId: ride.rideId,
            customer: ride.customer,
            driver: ride.rider || '',
            baseFare: ride.baseFareMicroAlgos || ride.fareMicroAlgos,
            waitFee: waitFee.toString(),
            trafficFee: trafficFee.toString(),
            weatherMultiplier: weatherMultiplier.toString(),
            driverPayout: driverPayout.toString(),
            customerRefund: customerRefund.toString(),
            settlementReason,
            customerPresent: presenceEvidence.length > 0,
            presenceEvidence,
            settlementTime: new Date().toISOString()
        };

        const hash = crypto.createHash('sha256').update(JSON.stringify(receipt)).digest('hex');
        return { receipt, hash };
    }
}
