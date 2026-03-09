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
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date'
    }
    
    // Get UTC timestamp and add 7 hours (25200000 ms = 7 * 60 * 60 * 1000)
    const vnTimestamp = dateObj.getTime() + 25200000
    const vnDate = new Date(vnTimestamp)
    
    // Format the date parts using UTC methods (since we already added the offset)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = months[vnDate.getUTCMonth()]
    const day = vnDate.getUTCDate()
    const year = vnDate.getUTCFullYear()
    
    let hours = vnDate.getUTCHours()
    const minutes = vnDate.getUTCMinutes().toString().padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12 || 12
    
    return `${month} ${day}, ${year}, ${hours}:${minutes} ${ampm}`
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
