import type { ReactNode } from 'react'

export function NavSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-0.5">
      <p className="mb-0.5 px-3 text-[10px] font-semibold tracking-widest text-fg-muted uppercase">
        {label}
      </p>
      {children}
    </section>
  )
}
