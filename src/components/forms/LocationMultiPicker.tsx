'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Combobox } from '@/components/forms/Combobox'
import { getDistrictOptions } from '@/lib/data/southIndiaDistricts'
import { getMasterDataAction } from '@/features/settings/actions/masterData.actions'

export function DistrictMultiPicker({
  selected, onChange,
}: {
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const options = getDistrictOptions()
  const [picker, setPicker] = useState('')

  function add(value: string) {
    if (!value || selected.includes(value)) return
    onChange([...selected, value])
    setPicker('')
  }
  function remove(value: string) {
    onChange(selected.filter((d) => d !== value))
  }

  return (
    <div className="space-y-2">
      <Combobox
        id="assignedDistricts" name="__districtPicker"
        options={options.filter((o) => !selected.includes(o.value))}
        value={picker}
        onChange={add}
        placeholder="Add a district…"
        searchPlaceholder="Search district…"
        emptyText="No district found"
      />
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((d) => (
            <span key={d} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
              {d}
              <button type="button" onClick={() => remove(d)} className="hover:text-red-600">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/** Taluks scoped to the currently-selected districts — resolved via MasterData
 * so the picker only offers taluks that actually belong to one of them. */
export function TalukMultiPicker({
  districts, selected, onChange,
}: {
  districts: string[]
  selected:  string[]
  onChange:  (next: string[]) => void
}) {
  const [options, setOptions] = useState<{ value: string; label: string }[]>([])
  const [picker, setPicker]   = useState('')

  useEffect(() => {
    if (districts.length === 0) { setOptions([]); return }
    Promise.all([getMasterDataAction('district'), getMasterDataAction('taluk')]).then(([distRes, talukRes]) => {
      if (!distRes.ok || !talukRes.ok) return
      const districtCodes = new Set(
        distRes.data
          .filter((d) => districts.some((name) => name.toLowerCase() === d.label.toLowerCase()))
          .map((d) => d.code)
      )
      setOptions(
        talukRes.data
          .filter((t) => t.isActive && t.parentCode && districtCodes.has(t.parentCode))
          .map((t) => ({ value: t.label, label: t.label }))
      )
    })
  }, [districts])

  function add(value: string) {
    if (!value || selected.includes(value)) return
    onChange([...selected, value])
    setPicker('')
  }
  function remove(value: string) {
    onChange(selected.filter((t) => t !== value))
  }

  return (
    <div className="space-y-2">
      <Combobox
        id="assignedTaluks" name="__talukPicker"
        options={options.filter((o) => !selected.includes(o.value))}
        value={picker}
        onChange={add}
        placeholder={districts.length === 0 ? 'Assign a district first' : 'Add a taluk…'}
        searchPlaceholder="Search taluk…"
        emptyText="No taluk found for the assigned districts"
        disabled={districts.length === 0}
      />
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
              {t}
              <button type="button" onClick={() => remove(t)} className="hover:text-red-600">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
