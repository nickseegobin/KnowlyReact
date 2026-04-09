'use client'

import Image from 'next/image'
import { useState } from 'react'

interface Props {
  type: 'adults' | 'children'
  selected: number
  onSelect: (index: number) => void
}

const AVATAR_COUNT = 10

export default function AvatarPicker({ type, selected, onSelect }: Props) {
  const [open, setOpen] = useState(false)

  const src = `/avatars/${type}/avatar-${selected}.png`

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-4 group"
      >
        <div className="relative">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-base-200 border-2 border-base-300 flex items-center justify-center">
            <Image src={src} alt="Selected avatar" width={64} height={64} className="object-cover" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-neutral text-neutral-content rounded-full flex items-center justify-center text-xs font-bold shadow">
            +
          </div>
        </div>
        <span className="text-base-content/60 group-hover:text-base-content transition-colors">
          {selected ? 'Change Picture' : 'Add Picture'}
        </span>
      </button>

      {/* Modal */}
      {open && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Choose an Avatar</h3>
            <div className="grid grid-cols-5 gap-3">
              {Array.from({ length: AVATAR_COUNT }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => { onSelect(n); setOpen(false) }}
                  className={`rounded-full overflow-hidden border-4 transition-all ${
                    selected === n ? 'border-neutral scale-105' : 'border-transparent hover:border-base-300'
                  }`}
                >
                  <Image
                    src={`/avatars/${type}/avatar-${n}.png`}
                    alt={`Avatar ${n}`}
                    width={64}
                    height={64}
                    className="object-cover w-full h-full"
                  />
                </button>
              ))}
            </div>
            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setOpen(false)} />
        </dialog>
      )}
    </>
  )
}
