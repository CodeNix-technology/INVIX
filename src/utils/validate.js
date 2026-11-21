export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim())

export const isPhone = (v) => /^[+\d][\d\s-]{5,18}$/.test(String(v || '').trim())

export const isURL = (v) => {
  try {
    const u = new URL(String(v || '').trim())
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export const isNumber = (v) => v !== '' && !Number.isNaN(Number(v))

export const required = (v) => String(v ?? '').trim().length > 0

/** GSTIN format: 2 digits, 10 chars PAN-ish, 1 entity code, Z, checksum */
export const isGSTIN = (v) => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(String(v || '').toUpperCase().trim())

/** HSN/SAC: 4/6/8 digits */
export const isHSN = (v) => /^(\d{4}|\d{6}|\d{8})$/.test(String(v || '').trim())

export const validate = (value, rules = []) => {
  for (const rule of rules) {
    const ok = typeof rule === 'function' ? rule(value) : validateOne(rule.name || rule, value, rule.arg)
    if (!ok) return typeof rule === 'object' && rule.message ? rule.message : defaultMessage(rule.name || rule, rule.arg)
  }
  return ''
}

function validateOne(name, value, arg) {
  switch (name) {
    case 'required': return required(value)
    case 'email': return !String(value || '').trim() || isEmail(value)
    case 'phone': return !String(value || '').trim() || isPhone(value)
    case 'url': return !String(value || '').trim() || isURL(value)
    case 'number': return !String(value || '').trim() || isNumber(value)
    case 'min': return isNumber(value) && Number(value) >= arg
    case 'max': return isNumber(value) && Number(value) <= arg
    case 'gstin': return !String(value || '').trim() || isGSTIN(value)
    case 'hsn': return !String(value || '').trim() || isHSN(value)
    default: return true
  }
}

function defaultMessage(name, arg) {
  switch (name) {
    case 'required': return 'This field is required'
    case 'email': return 'Enter a valid email'
    case 'phone': return 'Enter a valid phone number'
    case 'url': return 'Enter a valid URL'
    case 'number': return 'Enter a valid number'
    case 'min': return `Must be at least ${arg}`
    case 'max': return `Must be at most ${arg}`
    case 'gstin': return 'Enter a valid GSTIN (15 chars)'
    case 'hsn': return 'Enter a valid HSN/SAC (4, 6 or 8 digits)'
    default: return 'Invalid value'
  }
}
