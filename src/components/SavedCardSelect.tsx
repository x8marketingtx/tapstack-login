import { useEffect, useId, useRef, useState } from 'react'
import type { SavedPaymentMethod } from '../api/client'
import './SavedCardSelect.css'

type SavedCardSelectProps = {
  cards: SavedPaymentMethod[]
  value: 'new' | string
  onChange: (value: 'new' | string) => void
  label?: string
  newCardLabel?: string
}

function brandClass(brand?: string): string {
  const key = (brand || '').toLowerCase()
  if (key.includes('visa')) return 'visa'
  if (key.includes('master')) return 'mastercard'
  if (key.includes('amex') || key.includes('american')) return 'amex'
  if (key.includes('discover')) return 'discover'
  return 'card'
}

function brandLabel(brand?: string): string {
  const key = brandClass(brand)
  if (key === 'visa') return 'Visa'
  if (key === 'mastercard') return 'MC'
  if (key === 'amex') return 'Amex'
  if (key === 'discover') return 'Disc'
  if (!brand) return 'Card'
  return brand.replace(/[_-]+/g, ' ')
}

function cardSummary(card?: SavedPaymentMethod, fallback = 'a new card'): string {
  if (!card) return fallback
  return `${brandLabel(card.brand)} ${last4(card)}${card.exp ? ` ${card.exp}` : ''}`
}

function last4(card?: SavedPaymentMethod): string {
  return card?.last4 ? `•••• ${card.last4}` : 'On file'
}

export default function SavedCardSelect({
  cards,
  value,
  onChange,
  label = 'Pay with',
  newCardLabel = 'Use a new card',
}: SavedCardSelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const labelId = useId()
  const selected = cards.find((card) => card.id === value)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!cards.length) return null

  function pick(next: 'new' | string) {
    onChange(next)
    setOpen(false)
  }

  return (
    <div className="card-select" ref={rootRef}>
      <p className="topup-label" id={labelId}>
        {label}
      </p>
      <button
        type="button"
        className={`card-select-trigger ${open ? 'is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}, ${cardSummary(selected, newCardLabel)}`}
        onClick={() => setOpen((current) => !current)}
      >
        {selected ? (
          <>
            <span className={`card-select-brand is-${brandClass(selected.brand)}`}>{brandLabel(selected.brand)}</span>
            <span className="card-select-num">{last4(selected)}</span>
            {selected.exp ? <span className="card-select-exp">{selected.exp}</span> : null}
          </>
        ) : (
          <>
            <span className="card-select-brand is-new">New</span>
            <span className="card-select-num">{newCardLabel}</span>
          </>
        )}
        <svg className="card-select-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 6 L8 10 L12 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <ul className="card-select-menu" role="listbox" aria-labelledby={labelId}>
          {cards.map((card) => (
            <li key={card.id}>
              <button
                type="button"
                role="option"
                aria-selected={value === card.id}
                className={value === card.id ? 'is-active' : ''}
                onClick={() => pick(card.id)}
              >
                <span className={`card-select-brand is-${brandClass(card.brand)}`}>{brandLabel(card.brand)}</span>
                <span className="card-select-copy">
                  <strong>{last4(card)}</strong>
                  {card.exp ? <small>Expires {card.exp}</small> : null}
                </span>
                {value === card.id ? <span className="card-select-check">✓</span> : null}
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              role="option"
              aria-selected={value === 'new'}
              className={`card-select-add ${value === 'new' ? 'is-active' : ''}`}
              onClick={() => pick('new')}
            >
              {newCardLabel}
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  )
}
