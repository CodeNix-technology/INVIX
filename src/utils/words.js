const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function below1000(n, and = '') {
  let s = ''
  if (n >= 100) {
    s += `${ONES[Math.floor(n / 100)]} Hundred`
    n %= 100
    if (n) s += ' and '
  }
  if (n >= 20) {
    s += TENS[Math.floor(n / 10)]
    if (n % 10) s += `-${ONES[n % 10]}`
  } else if (n > 0) {
    s += ONES[n]
  }
  return s
}

function indianWords(n) {
  if (n === 0) return 'Zero'
  const parts = []
  const crore = Math.floor(n / 10000000)
  const lakh = Math.floor((n % 10000000) / 100000)
  const thousand = Math.floor((n % 100000) / 1000)
  const rest = n % 1000
  if (crore) parts.push(`${indianWords(crore)} Crore`)
  if (lakh) parts.push(`${below1000(lakh)} Lakh`)
  if (thousand) parts.push(`${below1000(thousand)} Thousand`)
  if (rest) parts.push(below1000(rest))
  return parts.join(' ')
}

function internationalWords(n) {
  if (n === 0) return 'Zero'
  const groups = [
    { v: 1e9, l: 'Billion' },
    { v: 1e6, l: 'Million' },
    { v: 1e3, l: 'Thousand' },
  ]
  const parts = []
  let rest = n
  for (const { v, l } of groups) {
    if (rest >= v) {
      parts.push(`${internationalWords(Math.floor(rest / v))} ${l}`)
      rest %= v
    }
  }
  if (rest) parts.push(below1000(rest))
  return parts.join(' ')
}

/**
 * Convert a number to words.
 * @param {number} value
 * @param {'indian'|'international'} system Indian uses Lakh/Crore.
 */
export function numberToWords(value, system = 'indian') {
  const n = Math.floor(Math.abs(Number(value) || 0))
  const frac = Math.round((Math.abs(Number(value) || 0) - n) * 100)
  const whole = system === 'indian' ? indianWords(n) : internationalWords(n)
  const sub = system === 'indian' ? 'Paise' : 'Cents'
  return frac > 0 ? `${whole} ${sub} ${numberToWords(frac / 100, system).replace(' Only', '')}`.trim() : whole
}

const CURRENCY_WORDS = {
  INR: { major: 'Rupees', minor: 'Paise' },
  USD: { major: 'Dollars', minor: 'Cents' },
  EUR: { major: 'Euros', minor: 'Cents' },
  GBP: { major: 'Pounds', minor: 'Pence' },
}

/** "Rupees One Lakh Twenty Thousand and Paise Fifty Only" */
export function amountInWords(amount, currency = 'INR', system = 'indian') {
  const words = numberToWords(amount, system)
  const cw = CURRENCY_WORDS[currency] || { major: currency, minor: 'Cents' }
  const minor = currency === 'INR' ? (system === 'indian' ? 'Paise' : 'Cents') : cw.minor
  const n = Number(amount) || 0
  const whole = Math.floor(n)
  const frac = Math.round((n - whole) * 100)
  let s = `${cw.major} ${words}`
  if (frac > 0) s += ` and ${minor} ${numberToWords(frac, system)}`
  return `${s} Only`
}
