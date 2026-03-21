import { ReactNode } from "react"

interface AuthShellProps {
  badge: string
  title: string
  description: string
  children: ReactNode
}

export function AuthShell({ badge, title, description, children }: AuthShellProps) {
  return (
    <main className="relative flex min-h-svh overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.2),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.18),transparent_24%),linear-gradient(180deg,rgba(2,6,23,1),rgba(15,23,42,0.98))]" />

      <div className="relative mx-auto grid min-h-svh w-full max-w-7xl gap-12 px-6 py-10 lg:grid-cols-[1.2fr_0.9fr] lg:px-10">
        <section className="flex flex-col justify-between rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur md:p-10">
          <div className="space-y-6">
            <div className="inline-flex w-fit rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
              {badge}
            </div>
            <div className="max-w-2xl space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">
                Marketplace access with a simple local account flow.
              </h1>
              <p className="text-lg leading-8 text-slate-300">{description}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-sm font-semibold text-white">Sign up once</p>
              <p className="mt-2 text-sm text-slate-400">We store first name, last name, DOB, username, and password for local access.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-sm font-semibold text-white">CSV backed</p>
              <p className="mt-2 text-sm text-slate-400">User records are saved to a local CSV file for now, which keeps setup lightweight.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-sm font-semibold text-white">DOB reset</p>
              <p className="mt-2 text-sm text-slate-400">If someone forgets their password, they can set a new one after DOB verification.</p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-md space-y-4">
            <div className="space-y-1 text-center lg:text-left">
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-200/80">{badge}</p>
              <h2 className="text-3xl font-semibold text-white">{title}</h2>
              <p className="text-slate-400">{description}</p>
            </div>
            {children}
          </div>
        </section>
      </div>
    </main>
  )
}
