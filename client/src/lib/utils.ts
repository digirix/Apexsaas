import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

export function formatCurrencySymbol(amount: number, currency = "USD"): string {
  // Get currency symbol
  const symbol = getCurrencySymbol(currency);
  
  // Format number without currency
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
  
  return `${symbol} ${formatted}`;
}

export function getCurrencySymbol(currency: string): string {
  const currencySymbols: Record<string, string> = {
    'USD': '$',
    'PKR': 'Rs.',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'AUD': 'A$',
    'CAD': 'C$',
    'CHF': 'CHF',
    'CNY': '¥',
    'INR': '₹',
    'AED': 'د.إ',
    'SAR': 'ر.س',
    'QAR': 'ر.ق',
    'KWD': 'د.ك',
    'BHD': 'د.ب',
    'OMR': 'ر.ع',
  };
  
  return currencySymbols[currency.toUpperCase()] || currency.toUpperCase();
}
