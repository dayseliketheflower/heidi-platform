/**
 * Platform fee and payout calculation utilities
 */

const PLATFORM_FEE_PERCENTAGE = parseInt(process.env.PLATFORM_FEE_PERCENTAGE || '20');
const PLATFORM_FEE_MINIMUM_CENTS = parseInt(process.env.PLATFORM_FEE_MINIMUM_CENTS || '500');

export interface BookingPriceBreakdown {
  priceTotal: number;        // What client pays (in cents)
  platformFee: number;       // Platform's cut (in cents)
  providerPayout: number;    // What provider receives (in cents)
}

/**
 * Calculate booking price breakdown
 * @param basePrice - Base price in cents (what would be paid to provider without fees)
 * @param durationMinutes - Duration of the session
 * @returns Price breakdown with total, fee, and payout
 */
export function calculateBookingPrice(
  providerHourlyRate: number,
  durationMinutes: number
): BookingPriceBreakdown {
  // Calculate base price based on hourly rate and duration
  const hours = durationMinutes / 60;
  const basePrice = Math.round(providerHourlyRate * hours);

  // Calculate platform fee (percentage of base, with minimum)
  const percentageFee = Math.round((basePrice * PLATFORM_FEE_PERCENTAGE) / 100);
  const platformFee = Math.max(percentageFee, PLATFORM_FEE_MINIMUM_CENTS);

  // Calculate what client pays (base + fee)
  const priceTotal = basePrice + platformFee;

  // Provider receives the base price
  const providerPayout = basePrice;

  return {
    priceTotal,
    platformFee,
    providerPayout,
  };
}

/**
 * Get platform fee configuration
 */
export function getPlatformFeeConfig() {
  return {
    percentage: PLATFORM_FEE_PERCENTAGE,
    minimumCents: PLATFORM_FEE_MINIMUM_CENTS,
  };
}

/**
 * Format price in cents to display string
 */
export function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toFixed(2)}`;
}

/**
 * Calculate membership price based on plan
 */
export function calculateMembershipPrice(
  monthlyPrice: number,
  billingPeriod: 'MONTHLY' | 'YEARLY'
): number {
  if (billingPeriod === 'YEARLY') {
    // Offer 10% discount for yearly
    return Math.round(monthlyPrice * 12 * 0.9);
  }
  return monthlyPrice;
}
