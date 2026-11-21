import React from 'react'

/**
 * Invix icon set — crisp 24×24 stroke icons (Lucide-style).
 * Usage: <IconPlus size={16} className="text-slate-400" />
 * All icons inherit `currentColor`, so they adapt to light/dark automatically.
 */

const I = ({ children, size = 18, strokeWidth = 2, ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...rest}
  >
    {children}
  </svg>
)

/* ---------- core actions ---------- */

export const IconPlus = (p) => (
  <I {...p}><path d="M12 5v14" /><path d="M5 12h14" /></I>
)
export const IconMinus = (p) => <I {...p}><path d="M5 12h14" /></I>
export const IconX = (p) => <I {...p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></I>
export const IconCheck = (p) => <I {...p}><path d="M20 6 9 17l-5-5" /></I>
export const IconCheckCircle = (p) => (
  <I {...p}><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></I>
)
export const IconXCircle = (p) => (
  <I {...p}><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></I>
)
export const IconAlert = (p) => (
  <I {...p}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4" /><path d="M12 17h.01" />
  </I>
)
export const IconInfo = (p) => (
  <I {...p}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></I>
)
export const IconSearch = (p) => (
  <I {...p}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></I>
)
export const IconPencil = (p) => (
  <I {...p}>
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </I>
)
export const IconTrash = (p) => (
  <I {...p}>
    <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M10 11v6" /><path d="M14 11v6" />
  </I>
)
export const IconCopy = (p) => (
  <I {...p}>
    <rect width="14" height="14" x="8" y="8" rx="2" />
    <path d="M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2" />
  </I>
)
export const IconDownload = (p) => (
  <I {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></I>
)
export const IconUpload = (p) => (
  <I {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5" /><path d="M12 3v12" /></I>
)
export const IconSave = (p) => (
  <I {...p}>
    <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
    <path d="M7 3v4a1 1 0 0 0 1 1h7" />
  </I>
)
export const IconShare = (p) => (
  <I {...p}>
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <path d="m8.6 13.5 6.8 4" /><path d="m15.4 6.5-6.8 4" />
  </I>
)
export const IconLink = (p) => (
  <I {...p}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </I>
)
export const IconPrinter = (p) => (
  <I {...p}>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" />
    <rect x="6" y="14" width="12" height="8" rx="1" />
  </I>
)
export const IconImage = (p) => (
  <I {...p}>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <circle cx="9" cy="9" r="2" /><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
  </I>
)
export const IconFileText = (p) => (
  <I {...p}>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />
  </I>
)
export const IconFileDown = (p) => (
  <I {...p}>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M12 11v6" /><path d="m9.5 14.5 2.5 2.5 2.5-2.5" />
  </I>
)
export const IconUndo = (p) => (
  <I {...p}><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></I>
)
export const IconRedo = (p) => (
  <I {...p}><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" /></I>
)
export const IconRefresh = (p) => (
  <I {...p}>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M3 21v-5h5" />
  </I>
)
export const IconSend = (p) => (
  <I {...p}>
    <path d="M14.5 2h-9A2.5 2.5 0 0 0 3 4.5v15A2.5 2.5 0 0 0 5.5 22h13a2.5 2.5 0 0 0 2.5-2.5v-13L14.5 2Z" transform="rotate(0)" />
    <path d="m22 2-7 20-4-9-9-4Z" />
  </I>
)
export const IconMail = (p) => (
  <I {...p}><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></I>
)
export const IconMessage = (p) => (
  <I {...p}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></I>
)

/* ---------- navigation & chrome ---------- */

export const IconMenu = (p) => (
  <I {...p}><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></I>
)
export const IconSun = (p) => (
  <I {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
  </I>
)
export const IconMoon = (p) => <I {...p}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></I>
export const IconChevronUp = (p) => <I {...p}><path d="m18 15-6-6-6 6" /></I>
export const IconChevronDown = (p) => <I {...p}><path d="m6 9 6 6 6-6" /></I>
export const IconChevronRight = (p) => <I {...p}><path d="m9 18 6-6-6-6" /></I>
export const IconChevronLeft = (p) => <I {...p}><path d="m15 18-6-6 6-6" /></I>
export const IconArrowLeft = (p) => (
  <I {...p}><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></I>
)
export const IconArrowRight = (p) => (
  <I {...p}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></I>
)
export const IconMore = (p) => (
  <I {...p}><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></I>
)
export const IconExternal = (p) => (
  <I {...p}><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></I>
)
export const IconGrip = (p) => (
  <I {...p}><circle cx="9" cy="6" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="9" cy="18" r="1" /><circle cx="15" cy="6" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="18" r="1" /></I>
)

/* ---------- domain ---------- */

export const IconDashboard = (p) => (
  <I {...p}>
    <rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" />
    <rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" />
  </I>
)
export const IconInvoice = (p) => (
  <I {...p}>
    <path d="M5 2h14a1 1 0 0 1 1 1v18l-2.5-1.5L15 21l-2.5-1.5L10 21l-2.5-1.5L5 21V3a1 1 0 0 1 1-1" transform="translate(0 0)" />
    <path d="M8 7h8" /><path d="M8 11h8" /><path d="M8 15h5" />
  </I>
)
export const IconReceipt = (p) => (
  <I {...p}>
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
    <path d="M8 7h8" /><path d="M8 11h8" /><path d="M8 15h5" />
  </I>
)
export const IconUsers = (p) => (
  <I {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </I>
)
export const IconUser = (p) => (
  <I {...p}>
    <circle cx="12" cy="8" r="5" />
    <path d="M20 21a8 8 0 0 0-16 0" />
  </I>
)
export const IconPackage = (p) => (
  <I {...p}>
    <path d="m7.5 4.27 9 5.15" />
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
  </I>
)
export const IconPalette = (p) => (
  <I {...p}>
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
    <path d="M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2v-1c0-1.1.9-2 2-2h1a4 4 0 0 0 4-4c0-6.08-4.03-9-9-9Z" />
  </I>
)
export const IconLayers = (p) => (
  <I {...p}>
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
    <path d="m6.08 9.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59" />
    <path d="m6.08 15.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59" />
  </I>
)
export const IconChart = (p) => (
  <I {...p}>
    <path d="M3 3v18h18" /><path d="M7 16v-3" /><path d="M12 16V8" /><path d="M17 16v-6" />
  </I>
)
export const IconTrendingUp = (p) => (
  <I {...p}><path d="m22 7-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" /></I>
)
export const IconTrendingDown = (p) => (
  <I {...p}><path d="m22 17-8.5-8.5-5 5L2 7" /><path d="M16 17h6v-6" /></I>
)
export const IconTarget = (p) => (
  <I {...p}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></I>
)
export const IconBell = (p) => (
  <I {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></I>
)
export const IconSettings = (p) => (
  <I {...p}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </I>
)
export const IconEye = (p) => (
  <I {...p}>
    <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
    <circle cx="12" cy="12" r="3" />
  </I>
)
export const IconTable = (p) => (
  <I {...p}>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M3 9h18" /><path d="M3 15h18" /><path d="M9 3v18" /><path d="M15 3v18" />
  </I>
)
export const IconGrid = (p) => (
  <I {...p}><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></I>
)
export const IconBuilding = (p) => (
  <I {...p}>
    <rect width="16" height="20" x="4" y="2" rx="1" />
    <path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" />
    <path d="M8 10h.01" /><path d="M16 10h.01" /><path d="M12 10h.01" /><path d="M8 14h.01" /><path d="M16 14h.01" /><path d="M12 14h.01" />
  </I>
)
export const IconBank = (p) => (
  <I {...p}>
    <path d="M3 22h18" /><path d="M3 10h18" />
    <path d="m5 10-2 6h18l-2-6" transform="translate(0 -2)" />
    <path d="M12 2 3 8h18Z" /><path d="M6 16v4" /><path d="M10 16v4" /><path d="M14 16v4" /><path d="M18 16v4" />
  </I>
)
export const IconTag = (p) => (
  <I {...p}>
    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
    <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
  </I>
)
export const IconPercent = (p) => (
  <I {...p}><path d="M19 5 5 19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></I>
)
export const IconHash = (p) => (
  <I {...p}><path d="M4 9h16" /><path d="M4 15h16" /><path d="M10 3 8 21" /><path d="M16 3l-2 18" /></I>
)
export const IconClock = (p) => (
  <I {...p}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></I>
)
export const IconCalendar = (p) => (
  <I {...p}>
    <rect width="18" height="18" x="3" y="4" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
  </I>
)
export const IconPhone = (p) => (
  <I {...p}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </I>
)
export const IconMapPin = (p) => (
  <I {...p}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
  </I>
)
export const IconGlobe = (p) => (
  <I {...p}><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></I>
)
export const IconLogOut = (p) => (
  <I {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></I>
)
export const IconFilter = (p) => (
  <I {...p}><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" /></I>
)
export const IconSortAsc = (p) => (
  <I {...p}><path d="m3 16 4 4 4-4" /><path d="M7 20V4" /><path d="M11 4h10" /><path d="M11 8h7" /><path d="M11 12h4" /></I>
)
export const IconZoomIn = (p) => (
  <I {...p}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /><path d="M11 8v6" /><path d="M8 11h6" /></I>
)
export const IconSparkle = (p) => (
  <I {...p}>
    <path d="M9.94 14.06 8 20l-1.94-5.94L.12 12l5.94-1.94L8 4.12l1.94 5.94L15.88 12Z" transform="scale(.82) translate(2.5 2.5)" />
    <path d="M20 5v4" transform="translate(0 0)" /><path d="M22 7h-4" />
  </I>
)
export const IconWallet = (p) => (
  <I {...p}>
    <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
    <path d="M21 9a1 1 0 0 0-1-1h-5a3 3 0 0 0 0 6h5a1 1 0 0 0 1-1z" />
  </I>
)
export const IconRotate = (p) => (
  <I {...p}><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></I>
)
export const IconLoader = (p) => (
  <I {...p}><path d="M21 12a9 9 0 1 1-6.22-8.56" /></I>
)
export const IconCompass = (p) => (
  <I {...p}><circle cx="12" cy="12" r="10" /><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z" /></I>
)
export const IconRupee = (p) => (
  <I {...p}><path d="M6 3h12" /><path d="M6 8h12" /><path d="m6 13 8.5 8" /><path d="M6 13h3a6 6 0 0 0 0-10" /></I>
)
