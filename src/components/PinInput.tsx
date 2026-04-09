'use client'

import { useRef } from 'react'

interface Props {
  value: string
  onChange: (val: string) => void
  label: string
}

export default function PinInput({ value, onChange, label }: Props) {
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  function handleChange(i: number, char: string) {
    if (!/^\d?$/.test(char)) return
    const arr = value.padEnd(4, '').split('')
    arr[i] = char
    const next = arr.join('').slice(0, 4)
    onChange(next)
    if (char && i < 3) inputs.current[i + 1]?.focus()
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      inputs.current[i - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (pasted) { onChange(pasted); inputs.current[Math.min(pasted.length, 3)]?.focus() }
    e.preventDefault()
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-base font-medium">{label}</p>
      <div className="flex gap-3">
        {[0, 1, 2, 3].map((i) => (
          <input
            key={i}
            ref={(el) => { inputs.current[i] = el }}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={value[i] ?? ''}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className="input input-bordered w-14 h-14 text-center text-xl font-bold"
          />
        ))}
      </div>
    </div>
  )
}
