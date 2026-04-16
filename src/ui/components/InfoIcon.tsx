import { useState } from 'react'

interface InfoIconProps {
  /** Tooltip açıklama metni */
  text: string
  /** Tooltip genişliği (varsayılan: 220px) */
  width?: number
}

/**
 * Soru işareti ikonu — hover/focus'ta açıklama balonu gösterir.
 * Tüm panel başlıklarında tekrar kullanılır.
 */
export function InfoIcon({ text, width = 220 }: InfoIconProps) {
  const [visible, setVisible] = useState(false)

  return (
    <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      <button
        type="button"
        aria-label="Detaylı bilgi"
        onMouseEnter={() => { setVisible(true) }}
        onMouseLeave={() => { setVisible(false) }}
        onFocus={() => { setVisible(true) }}
        onBlur={() => { setVisible(false) }}
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          border: '1px solid #4e4e6e',
          background: 'transparent',
          color: '#6e6e8e',
          fontSize: '0.65rem',
          fontWeight: 700,
          cursor: 'help',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          lineHeight: 1,
        }}
      >
        ?
      </button>
      {visible && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            right: 0,
            width: `${String(width)}px`,
            background: '#1a1a2e',
            border: '1px solid rgba(74,198,210,0.4)',
            borderRadius: '0.4rem',
            padding: '0.5rem 0.65rem',
            fontSize: '0.72rem',
            color: '#c8c8e0',
            lineHeight: 1.45,
            zIndex: 100,
            pointerEvents: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
          }}
        >
          {text}
        </div>
      )}
    </span>
  )
}
