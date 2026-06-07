import { AuroraBackground } from '@/components/player/AuroraBackground'

/** Fixed full-window gradient layer — shifts with accent color */
export function AmbientBackground() {
  return (
    <div className="ambient-bg" aria-hidden>
      <div className="aurora-layer">
        <AuroraBackground subtle className="opacity-100" />
      </div>
    </div>
  )
}