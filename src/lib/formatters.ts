/**
 * Currency and number formatting utilities
 */

/**
 * Format a number as currency
 * @param amount - The numeric amount to format
 * @param currencySymbol - Optional currency symbol (default: '₹')
 * @returns Formatted string like "₹1,234.56" or "$1,234.56"
 */
export function formatCurrency(amount: number | string, currencySymbol: string = '₹'): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(num)) return `${currencySymbol}0.00`;

    // Format with thousand separators and 2 decimal places
    const formatted = num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${currencySymbol}${formatted}`;
}

/**
 * Format a number with thousand separators
 * @param num - The number to format
 * @returns Formatted string like "1,234"
 */
export function formatNumber(num: number): string {
    if (isNaN(num)) return '0';

    return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Format a number as a percentage
 * @param value - The decimal value (e.g., 0.856 for 85.6%)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string like "85.6%"
 */
export function formatPercentage(value: number, decimals: number = 1): string {
    if (isNaN(value)) return '0%';

    return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a date for display
 * @param date - Date string or Date object
 * @returns Formatted date string
 */
export function formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;

    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d);
}

/**
 * Format a short date (no time)
 * @param date - Date string or Date object
 * @returns Formatted date string like "Jan 15, 2026"
 */
export function formatShortDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;

    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(d);
}
