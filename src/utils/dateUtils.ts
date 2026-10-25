import { Weekday, DayDateItem } from '../types/task';

export const WEEKDAY_ORDER: Weekday[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  SUN: 'Sun',
  MON: 'Mon',
  TUE: 'Tue',
  WED: 'Wed',
  THU: 'Thu',
  FRI: 'Fri',
  SAT: 'Sat',
};

/**
 * Returns local YYYY-MM-DD string without UTC timezone shift
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Formats a YYYY-MM-DD date string into 'MMM D, YYYY' (e.g. 'Oct 13, 2026')
 */
export function formatDisplayDate(dateStr: string): string {
  try {
    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);
    if (!year || !month || !day) return dateStr;
    const monthName = MONTH_LABELS[month - 1] || '';
    return `${monthName} ${day}, ${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Returns the uppercase Weekday string for a given Date
 */
export function getWeekdayFromDate(date: Date): Weekday {
  const dayIndex = date.getDay(); // 0 is Sunday, 6 is Saturday
  return WEEKDAY_ORDER[dayIndex];
}

/**
 * Generates the 7 days of the week (Sunday through Saturday) containing the reference date shifted by weekOffset
 */
export function getWeekDays(
  referenceDate: Date = new Date(),
  weekOffset: number = 0
): DayDateItem[] {
  const current = new Date(referenceDate);
  // Shift by weekOffset weeks
  current.setDate(current.getDate() + weekOffset * 7);

  const todayStr = formatLocalDate(new Date());

  // Find Sunday of this week (0 = Sunday)
  const dayOfWeek = current.getDay();
  const sunday = new Date(current);
  sunday.setDate(current.getDate() - dayOfWeek);

  const days: DayDateItem[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);

    const fullDateStr = formatLocalDate(d);
    const dayName = WEEKDAY_ORDER[i];

    days.push({
      dayName,
      dayLabel: WEEKDAY_LABELS[dayName],
      dateNumber: d.getDate(),
      fullDateString: fullDateStr,
      isToday: fullDateStr === todayStr,
      isPast: fullDateStr < todayStr,
      isFuture: fullDateStr > todayStr,
    });
  }

  return days;
}
