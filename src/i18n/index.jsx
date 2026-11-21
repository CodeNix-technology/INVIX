import { useEffect } from 'react'
import { useUI } from '../store/ui'

const DICTS = {
  en: null, // English is the source keys themselves
  ta: {
    'Dashboard': 'டாஷ்போர்டு', 'Invoices': 'விலைப்புண்ணியங்கள்', 'New Invoice': 'புதிய விலைப்புண்ணி',
    'Clients': 'வாடிக்கையாளர்கள்', 'Items': 'பொருட்கள்', 'Templates': 'வார்ப்புருக்கள்', 'Reports': 'அறிக்கைகள்',
    'Settings': 'அமைப்புகள்', 'Create Invoice Free': 'இலவச விலைப்புண்ணி உருவாக்கு',
    'Smart Invoices, Made Simple': 'நுண்ணறிவு விலைப்புண்ணிகள், எளிதாக',
    'Preview': 'முன்னோட்டம்', 'Save': 'சேமி', 'Download PDF': 'PDF பதிவிறக்கு', 'Print': 'அச்சிடு',
    'Share': 'பங்கிடு', 'Duplicate': 'நகல்', 'Delete': 'நீக்கு', 'Edit': 'திருத்து', 'Cancel': 'ரத்து',
    'Search': 'தேடு', 'Total': 'மொத்தம்', 'Paid': 'செலுத்தப்பட்டது', 'Pending': 'நிலுவை', 'Overdue': 'முதிர்ந்தது',
    'Sign in': 'உள்நுழை', 'Sign up': 'பதிவு செய்', 'Sign out': 'வெளியேறு', 'Customize': 'தனிப்பயனாக்கு',
    'Add Item': 'பொருள் சேர்', 'Notes': 'குறிப்புகள்', 'Terms': 'விதிமுறைகள்', 'Sync now': 'இப்போது ஒத்திசை',
    'Loading…': 'ஏற்றுகிறது…', 'Amount in words': 'எண்ணுக்குரிய சொற்கள்',
  },
  hi: {
    'Dashboard': 'डैशबोर्ड', 'Invoices': 'इनवॉइस', 'New Invoice': 'नई इनवॉइस',
    'Clients': 'ग्राहक', 'Items': 'आइटम', 'Templates': 'टेम्पलेट', 'Reports': 'रिपोर्ट',
    'Settings': 'सेटिंग्स', 'Create Invoice Free': 'मुफ़्त इनवॉइस बनाएं',
    'Smart Invoices, Made Simple': 'स्मार्ट इनवॉइस, सरल बनाम',
    'Preview': 'पूर्वावलोकन', 'Save': 'सहेजें', 'Download PDF': 'PDF डाउनलोड करें', 'Print': 'प्रिंट',
    'Share': 'साझा करें', 'Duplicate': 'डुप्लिकेट', 'Delete': 'हटाएं', 'Edit': 'संपादित करें', 'Cancel': 'रद्द',
    'Search': 'खोजें', 'Total': 'कुल', 'Paid': 'भुगतान हुआ', 'Pending': 'लंबित', 'Overdue': 'अतिदेय',
    'Sign in': 'साइन इन', 'Sign up': 'साइन अप', 'Sign out': 'साइन आउट', 'Customize': 'अनुकूलित',
    'Add Item': 'आइटम जोड़ें', 'Notes': 'नोट्स', 'Terms': 'शर्तें', 'Sync now': 'अभी सिंक करें',
    'Loading…': 'लोड हो रहा है…', 'Amount in words': 'शब्दों में राशि',
  },
}

export function translate(key, lang = 'en') {
  if (lang === 'en') return key
  return DICTS[lang]?.[key] || key
}

export function useT() {
  const language = useUI((s) => s.language)
  return (key) => translate(key, language)
}

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
]

/** Keep <html lang> in sync on mount */
export function useSyncLang() {
  const language = useUI((s) => s.language)
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])
}
