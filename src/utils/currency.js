export const CURRENCIES = [
  { code: 'INR', symbol: '₹', locale: 'en-IN', name: 'Indian Rupee', fractionDigits: 2 },
  { code: 'USD', symbol: '$', locale: 'en-US', name: 'US Dollar', fractionDigits: 2 },
  { code: 'EUR', symbol: '€', locale: 'de-DE', name: 'Euro', fractionDigits: 2 },
  { code: 'GBP', symbol: '£', locale: 'en-GB', name: 'British Pound', fractionDigits: 2 },
  { code: 'AUD', symbol: 'A$', locale: 'en-AU', name: 'Australian Dollar', fractionDigits: 2 },
  { code: 'CAD', symbol: 'C$', locale: 'en-CA', name: 'Canadian Dollar', fractionDigits: 2 },
  { code: 'SGD', symbol: 'S$', locale: 'en-SG', name: 'Singapore Dollar', fractionDigits: 2 },
  { code: 'AED', symbol: 'AED', locale: 'en-AE', name: 'UAE Dirham', fractionDigits: 2 },
  { code: 'JPY', symbol: '¥', locale: 'ja-JP', name: 'Japanese Yen', fractionDigits: 0 },
]

export const getCurrency = (code) => CURRENCIES.find((c) => c.code === code) || CURRENCIES[0]

/** Locale-aware money formatting */
export function formatMoney(amount, currencyCode = 'INR', { compact = false } = {}) {
  const c = getCurrency(currencyCode)
  const n = Number(amount) || 0
  try {
    return new Intl.NumberFormat(c.locale, {
      style: 'currency',
      currency: c.code,
      minimumFractionDigits: compact && Number.isInteger(n) ? 0 : c.fractionDigits,
      maximumFractionDigits: c.fractionDigits,
      notation: compact && Math.abs(n) >= 100000 ? 'compact' : 'standard',
    }).format(n)
  } catch {
    return `${c.symbol}${n.toFixed(c.fractionDigits)}`
  }
}

/** Plain number formatting (no symbol) */
export function formatNumber(n, currencyCode = 'INR') {
  const c = getCurrency(currencyCode)
  try {
    return new Intl.NumberFormat(c.locale, { minimumFractionDigits: c.fractionDigits, maximumFractionDigits: c.fractionDigits }).format(Number(n) || 0)
  } catch {
    return (Number(n) || 0).toFixed(2)
  }
}

export const currencySymbol = (code) => getCurrency(code).symbol
