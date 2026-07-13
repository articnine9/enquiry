'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronsUpDown, Check, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  id:           string
  name:         string          // hidden input name → submitted with the form
  options:      ComboboxOption[]
  value:        string
  onChange:     (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?:   string
  disabled?:    boolean
  disabledHint?: string          // shown inside the closed control when disabled
  hasError?:    boolean
}

/**
 * Accessible searchable single-select. Keeps a hidden <input> in sync so it
 * works inside a plain <form action={serverAction}> without extra plumbing.
 */
export function Combobox({
  id,
  name,
  options,
  value,
  onChange,
  placeholder       = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText         = 'No matches',
  disabled          = false,
  disabledHint,
  hasError          = false,
}: ComboboxProps) {
  const [open,   setOpen]   = useState(false)
  const [query,  setQuery]  = useState('')
  const [active, setActive] = useState(0)      // highlighted index
  const rootRef  = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value) ?? null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Focus the search box when opening; reset transient state on close
  useEffect(() => {
    if (open) {
      setActive(0)
      const t = setTimeout(() => inputRef.current?.focus(), 0)
      return () => clearTimeout(t)
    }
    setQuery('')
  }, [open])

  function select(val: string) {
    onChange(val)
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && filtered[active]) { e.preventDefault(); select(filtered[active].value) }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const control = cn(
    'w-full flex items-center gap-2 px-3 py-2 rounded-lg border bg-white dark:bg-slate-900 text-sm text-left',
    'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    hasError
      ? 'border-red-400 focus:ring-red-400/40 focus:border-red-400'
      : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
  )

  return (
    <div ref={rootRef} className="relative">
      {/* hidden input carries the value into the form submission */}
      <input type="hidden" name={name} value={value} />

      <button
        type="button"
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={control}
      >
        <span className={cn('flex-1 truncate', !selected && 'text-slate-400')}>
          {selected ? selected.label : (disabled && disabledHint ? disabledHint : placeholder)}
        </span>
        {selected && !disabled && (
          <X
            className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 shrink-0"
            onClick={(e) => { e.stopPropagation(); onChange('') }}
          />
        )}
        <ChevronsUpDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {open && !disabled && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-800">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActive(0) }}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
            />
          </div>

          <ul id={`${id}-listbox`} role="listbox" className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400">{emptyText}</li>
            ) : filtered.map((o, i) => (
              <li key={o.value} role="option" aria-selected={o.value === value}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => select(o.value)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors',
                    i === active ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                 : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  )}
                >
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.value === value && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
