'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const DotLottieReact = dynamic(
  () => import('@lottiefiles/dotlottie-react').then(m => m.DotLottieReact),
  { ssr: false }
)

interface DesignConfig {
  home_lottie?: string
  home_image?:  string
  home_scale?:  number
}

const SCALE_WIDTHS: Record<number, string> = {
  1: '30%',
  2: '50%',
  3: '65%',
  4: '82%',
  5: '100%',
}

export default function HomeLottiePanel() {
  const [config, setConfig] = useState<DesignConfig | null>(null)

  useEffect(() => {
    fetch('/api/design')
      .then(r => r.ok ? r.json() : {})
      .then((d: DesignConfig) => setConfig(d))
      .catch(() => setConfig({}))
  }, [])

  if (!config) return null

  if (config.home_lottie?.trim()) {
    const width = SCALE_WIDTHS[config.home_scale ?? 3] ?? '65%'
    return (
      <DotLottieReact
        src={config.home_lottie}
        autoplay
        loop
        style={{ width }}
      />
    )
  }

  if (config.home_image?.trim()) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url('${config.home_image}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
    )
  }

  return null
}
