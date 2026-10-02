import { useCallback, useMemo, useState } from 'react'
import {
  defaultCustomDateRange,
  type CustomDateRange,
  validateCustomDateRange,
} from '../lib/reportRange'

export function useCustomReportRange<T extends string>(initialPreset: T) {
  const [preset, setPreset] = useState<T>(initialPreset)
  const [customRange, setCustomRange] = useState<CustomDateRange>(() => defaultCustomDateRange())
  const [modalOpen, setModalOpen] = useState(false)

  const isCustom = preset === ('custom' as T)

  const pickPreset = useCallback((id: T) => {
    if (id === ('custom' as T)) {
      setModalOpen(true)
      return
    }
    setPreset(id)
  }, [])

  const applyCustom = useCallback((from: string, to: string): string | null => {
    const error = validateCustomDateRange(from, to)
    if (error) return error
    setCustomRange({ from, to })
    setPreset('custom' as T)
    setModalOpen(false)
    return null
  }, [])

  const queryKey = useMemo(
    () => (isCustom ? `custom:${customRange.from}:${customRange.to}` : preset),
    [isCustom, customRange.from, customRange.to, preset],
  )

  const apiCustom = isCustom ? customRange : null

  const modalProps = useMemo(
    () => ({
      open: modalOpen,
      from: customRange.from,
      to: customRange.to,
      onClose: () => setModalOpen(false),
      onApply: applyCustom,
    }),
    [modalOpen, customRange.from, customRange.to, applyCustom],
  )

  return {
    preset,
    customRange,
    isCustom,
    queryKey,
    apiCustom,
    pickPreset,
    applyCustom,
    modalOpen,
    setModalOpen,
    modalProps,
  }
}
