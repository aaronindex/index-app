// lib/time/coarseWindow.ts
// Convert coarse window choices to thinking time ranges
// Returns UTC ISO timestamps (stable)

export type CoarseWindow = "today" | "yesterday" | "last_week" | "last_month";

/**
 * Convert coarse window choice to thinking time range
 * 
 * Rules:
 * - today = start of local day → end of local day
 * - yesterday = yesterday local day
 * - last_week = now-7d → now (or start of day 7d ago → end of today)
 * - last_month = now-30d → now (simple v0)
 * 
 * Returns ISO in UTC (stable).
 * 
 * @param params - Conversion parameters
 * @returns Thinking time range (start_at, end_at in ISO UTC)
 */
export function coarseWindowToThinkingRange(params: {
  choice: CoarseWindow;
  nowIso: string;
  timezone?: string; // default America/Denver
}): { start_at: string; end_at: string } {
  const { choice, nowIso, timezone = "America/Denver" } = params;
  const now = new Date(nowIso);

  // Helper to get start/end of day in timezone, converted to UTC ISO
  // Simplified v0: uses Intl API to get date components in timezone
  function getDayBoundsInTimezone(date: Date, tz: string): { start: Date; end: Date } {
    // Get date components in the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    const parts = formatter.formatToParts(date);
    const year = parseInt(parts.find(p => p.type === 'year')!.value);
    const month = parseInt(parts.find(p => p.type === 'month')!.value);
    const day = parseInt(parts.find(p => p.type === 'day')!.value);
    
    // Create date strings for start and end of day in the timezone
    const startStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`;
    const endStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T23:59:59.999`;
    
    // Get timezone offset by creating a date at noon in both timezones
    const noonUTC = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00Z`);
    const noonTZ = new Date(noonUTC.toLocaleString('en-US', { timeZone: tz }));
    const tzOffset = noonUTC.getTime() - noonTZ.getTime();
    
    // Create dates for start/end, then adjust for timezone offset
    const tempStart = new Date(startStr);
    const tempEnd = new Date(endStr);
    
    // Adjust to UTC
    const utcStart = new Date(tempStart.getTime() + tzOffset);
    const utcEnd = new Date(tempEnd.getTime() + tzOffset);
    
    return { start: utcStart, end: utcEnd };
  }

  switch (choice) {
    case "today": {
      const bounds = getDayBoundsInTimezone(now, timezone);
      return {
        start_at: bounds.start.toISOString(),
        end_at: bounds.end.toISOString(),
      };
    }

    case "yesterday": {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const bounds = getDayBoundsInTimezone(yesterday, timezone);
      return {
        start_at: bounds.start.toISOString(),
        end_at: bounds.end.toISOString(),
      };
    }

    case "last_week": {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoBounds = getDayBoundsInTimezone(weekAgo, timezone);
      const todayBounds = getDayBoundsInTimezone(now, timezone);
      return {
        start_at: weekAgoBounds.start.toISOString(),
        end_at: todayBounds.end.toISOString(),
      };
    }

    case "last_month": {
      const monthAgo = new Date(now);
      monthAgo.setDate(monthAgo.getDate() - 30);
      return {
        start_at: monthAgo.toISOString(),
        end_at: now.toISOString(),
      };
    }

    default:
      throw new Error(`Unknown coarse window: ${choice}`);
  }
}
