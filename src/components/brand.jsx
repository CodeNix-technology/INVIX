import React from 'react'

/** Invix logo mark — uses /invix.png everywhere */
export function LogoMark({ size = 30, className = '' }) {
  return (
    <img
      src="/invix.png"
      alt="Invix"
      width={size}
      height={size}
      className={`block shrink-0 object-contain ${className}`.trim()}
      draggable={false}
    />
  )
}

export function Wordmark({ size = 30, textClass = 'text-on-surface', showText = true }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      {showText ? <span className={`font-headline-md ${textClass}`}>Invix</span> : null}
    </span>
  )
}
