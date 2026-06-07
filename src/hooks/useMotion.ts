import { useSettingsStore } from '@/store/settingsStore'
import { motionTransition, springTransition } from '@/lib/motion'

export function useMotion() {
  const reduceMotion = useSettingsStore((s) => s.settings.reduceMotion)

  return {
    reduceMotion,
    transition: (duration = 0.38) => motionTransition(reduceMotion, duration),
    spring: springTransition(reduceMotion),
    disabled: reduceMotion,
  }
}
