/**
 * Date utility functions for formatting dates with Vietnam timezone (UTC+7)
 */

/**
 * Format date to Vietnam timezone (UTC+7)
 * @param date - Date string or Date object from backend (UTC)
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string in Vietnam timezone
 */
export const formatDateVN = (
  date: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!date) return 'N/A'
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    // Default options with Vietnam timezone
    const defaultOptions: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    }
    
    return dateObj.toLocaleString('en-US', defaultOptions)
  } catch (error) {
    return 'Invalid date'
  }
}

/**
 * Format date with time to Vietnam timezone
 * @param date - Date string or Date object from backend (UTC)
 * @returns Formatted date string with time (e.g., "Dec 25, 2024, 02:30 PM")
 */
export const formatDateTimeVN = (date: string | Date | null | undefined): string => {
  if (!date) return 'N/A'
  
  try {
    const parseUtcFromBackend = (rawDate: string | Date): Date => {
      if (rawDate instanceof Date) return rawDate

      const hasTimezone = /Z|[+-]\d{2}:?\d{2}$/.test(rawDate)
      if (hasTimezone) {
        return new Date(rawDate)
      }

      const matched = rawDate.match(
        /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/
      )

      if (!matched) {
        return new Date(rawDate)
      }

      const [, year, month, day, hour, minute, second, fraction] = matched
      const milliseconds = fraction
        ? Math.floor(Number(`0.${fraction}`) * 1000)
        : 0

      return new Date(
        Date.UTC(
          Number(year),
          Number(month) - 1,
          Number(day),
          Number(hour),
          Number(minute),
          Number(second),
          milliseconds
        )
      )
    }

    const dateObj = parseUtcFromBackend(date)
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date'
    }
    
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(dateObj)
  } catch (error) {
    return 'Invalid date'
  }
}

/**
 * Format date only (no time) to Vietnam timezone
 * @param date - Date string or Date object from backend (UTC)
 * @returns Formatted date string (e.g., "Dec 25, 2024")
 */
export const formatDateOnlyVN = (date: string | Date | null | undefined): string => {
  return formatDateVN(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Format time only to Vietnam timezone
 * @param date - Date string or Date object from backend (UTC)
 * @returns Formatted time string (e.g., "02:30 PM")
 */
export const formatTimeVN = (date: string | Date | null | undefined): string => {
  return formatDateVN(date, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

/**
 * Format date for display in tables (compact format)
 * @param date - Date string or Date object from backend (UTC)
 * @returns Formatted date string (e.g., "25/12/2024")
 */
export const formatDateCompactVN = (date: string | Date | null | undefined): string => {
  return formatDateVN(date, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}
