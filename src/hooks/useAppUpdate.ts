import { useEffect, useState, useCallback } from 'react'

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error'

export interface UpdateState {
  status: UpdateStatus
  version?: string
  error?: string
  message?: string
  percent?: number
}

export function useAppUpdate() {
  const [state, setState] = useState<UpdateState>({ status: 'idle' })

  useEffect(() => {
    if (!window.electron?.update) return

    void window.electron.update.getStatus().then((s) => {
      setState({
        status: (s.status as UpdateStatus) ?? 'idle',
        version: s.version,
        error: s.error,
        message: s.message,
        percent: s.percent,
      })
    })

    const unsub = window.electron.update.onStatus((payload) => {
      setState({
        status: (payload.status as UpdateStatus) ?? 'idle',
        version: payload.version,
        error: payload.error,
        message: payload.message,
        percent: payload.percent,
      })
    })

    return () => {
      unsub()
    }
  }, [])

  const check = useCallback(async () => {
    if (!window.electron?.update) return
    setState((s) => ({ ...s, status: 'checking', error: undefined }))
    const result = await window.electron.update.check()
    setState({
      status: (result.status as UpdateStatus) ?? 'idle',
      version: result.version,
      error: result.error,
      message: result.message,
      percent: result.percent,
    })
  }, [])

  const download = useCallback(async () => {
    if (!window.electron?.update) return false
    setState((s) => ({ ...s, status: 'downloading', error: undefined }))
    return window.electron.update.download()
  }, [])

  const install = useCallback(() => {
    if (!window.electron?.update) return false
    void window.electron.update.install()
    return true
  }, [])

  return { state, check, download, install }
}
