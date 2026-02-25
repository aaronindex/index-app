// lib/structure/hash/stateHash.bucket.ts
// Bucketing utilities for timestamp and numeric normalization
// Ensures hash stability by reducing precision

/**
 * Bucket a timestamp to a time window
 * Truncates to the specified window boundary
 * 
 * @param iso - ISO timestamp string
 * @param window - Bucket size: "hour" or "day"
 * @returns Bucketed ISO timestamp string (e.g., "2024-01-15T14:00:00.000Z" for hour bucket)
 * @throws Error if ISO string is invalid
 */
export function bucketTimestamp(iso: string, window: "hour" | "day" = "hour"): string {
  if (!iso || typeof iso !== 'string') {
    throw new Error(`[stateHash] bucketTimestamp: invalid ISO string: ${iso}`);
  }

  const date = new Date(iso);
  if (isNaN(date.getTime())) {
    throw new Error(`[stateHash] bucketTimestamp: invalid date: ${iso}`);
  }

  if (window === "hour") {
    // Truncate to hour: set minutes, seconds, milliseconds to 0
    const bucketed = new Date(date);
    bucketed.setUTCMinutes(0);
    bucketed.setUTCSeconds(0);
    bucketed.setUTCMilliseconds(0);
    return bucketed.toISOString();
  } else if (window === "day") {
    // Truncate to day: set hours, minutes, seconds, milliseconds to 0
    const bucketed = new Date(date);
    bucketed.setUTCHours(0);
    bucketed.setUTCMinutes(0);
    bucketed.setUTCSeconds(0);
    bucketed.setUTCMilliseconds(0);
    return bucketed.toISOString();
  } else {
    throw new Error(`[stateHash] bucketTimestamp: invalid window: ${window}`);
  }
}

/**
 * Round a number to specified decimal places
 * Used for score bucketing to prevent hash churn from precision
 * 
 * @param n - Number to round
 * @param decimals - Number of decimal places (default: 2)
 * @returns Rounded number
 * @throws Error if input is NaN or undefined
 */
export function roundBucket(n: number, decimals: number = 2): number {
  if (typeof n !== 'number') {
    throw new Error(`[stateHash] roundBucket: invalid number: ${n}`);
  }
  
  if (isNaN(n)) {
    throw new Error(`[stateHash] roundBucket: NaN detected`);
  }
  
  if (n === Infinity || n === -Infinity) {
    throw new Error(`[stateHash] roundBucket: Infinity detected: ${n}`);
  }

  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}
