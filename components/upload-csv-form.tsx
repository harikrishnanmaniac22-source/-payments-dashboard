"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, UploadCloud } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type UploadState =
  | { type: "idle" }
  | { type: "error"; message: string }
  | {
      type: "success"
      message: string
      details: string
    }

export function UploadCsvForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [state, setState] = useState<UploadState>({ type: "idle" })

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white">Upload Marketplace CSV</CardTitle>
        <CardDescription className="text-slate-400">
          Upload any CSV that includes a `channel` or `marketplace` column. Rows are normalized and routed to Amazon, Flipkart, or Myntra automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            const form = event.currentTarget
            const formData = new FormData(form)
            const file = formData.get("file")

            if (!(file instanceof File) || file.size === 0) {
              setState({ type: "error", message: "Choose a CSV file before uploading." })
              return
            }

            if (!file.name.toLowerCase().endsWith(".csv")) {
              setState({ type: "error", message: "Only .csv files are supported." })
              return
            }

            startTransition(async () => {
              const payload = new FormData()
              payload.set("file", file)

              const response = await fetch("/api/uploads", {
                method: "POST",
                body: payload,
              })

              const result = (await response.json()) as
                | { ok: true; message: string; details: string }
                | { ok: false; error: string }

              if (!response.ok || !result.ok) {
                setState({
                  type: "error",
                  message: result.ok ? "Upload failed." : result.error,
                })
                return
              }

              setState({
                type: "success",
                message: result.message,
                details: result.details,
              })

              router.refresh()
              form.reset()
            })
          }}
        >
          <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-slate-950/40 p-6 text-center">
            <UploadCloud className="size-8 text-slate-300" />
            <div>
              <p className="font-medium text-white">Drop a CSV here or click to browse</p>
              <p className="mt-1 text-sm text-slate-400">
                Supported columns include `channel`, `marketplace`, `total_received`, `pending_settlement`, `refunds`, and `disputes`.
              </p>
            </div>
            <input type="file" name="file" accept=".csv,text/csv" className="hidden" />
          </label>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
              Upload and Recalculate
            </Button>
            <p className="text-sm text-slate-400">New rows are upserted by channel + order + settlement reference.</p>
          </div>
        </form>

        {state.type === "error" && (
          <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">
            {state.message}
          </div>
        )}

        {state.type === "success" && (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            <p className="font-medium">{state.message}</p>
            <p className="mt-1 text-emerald-100/80">{state.details}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
