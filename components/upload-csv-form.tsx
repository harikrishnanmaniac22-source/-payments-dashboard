"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, UploadCloud, X } from "lucide-react"

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

type ChannelType = "amazon" | "flipkart" | "myntra"

type FileState = {
  b2c: File | null
  returns: File | null
  transactions: File | null
  singleFile: File | null
}

export function UploadCsvForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [state, setState] = useState<UploadState>({ type: "idle" })
  const [channel, setChannel] = useState<ChannelType>("amazon")
  const [files, setFiles] = useState<FileState>({ b2c: null, returns: null, transactions: null, singleFile: null })

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white">Upload Marketplace Files</CardTitle>
        <CardDescription className="text-slate-400">
          Select your marketplace and upload the required files for reconciliation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Channel Selection */}
        <div className="flex gap-2">
          {(["amazon", "flipkart", "myntra"] as const).map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => {
                setChannel(ch)
                setFiles({ b2c: null, returns: null, transactions: null, singleFile: null })
                setState({ type: "idle" })
              }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                channel === ch
                  ? "bg-blue-500/20 text-blue-200 border border-blue-400/50"
                  : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50"
              }`}
            >
              {ch.charAt(0).toUpperCase() + ch.slice(1)}
            </button>
          ))}
        </div>

        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault()

            if (channel === "amazon") {
              if (!files.b2c || !files.returns || !files.transactions) {
                setState({
                  type: "error",
                  message: "All three files (B2C, Returns, and Transactions) are required.",
                })
                return
              }

              const b2cValid = files.b2c.name.toLowerCase().endsWith(".csv") && files.b2c.size > 0
              const returnsValid = files.returns.name.toLowerCase().endsWith(".csv") && files.returns.size > 0
              const transactionsValid = files.transactions.name.toLowerCase().endsWith(".csv") && files.transactions.size > 0

              if (!b2cValid || !returnsValid || !transactionsValid) {
                setState({
                  type: "error",
                  message: "All files must be valid CSV files with content.",
                })
                return
              }

              startTransition(async () => {
                const payload = new FormData()
                payload.set("channel", "amazon")
                payload.set("b2c", files.b2c!)
                payload.set("returns", files.returns!)
                payload.set("transactions", files.transactions!)

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

                setFiles({ b2c: null, returns: null, transactions: null, singleFile: null })
                router.refresh()
              })
            } else {
              // Flipkart or Myntra
              if (!files.singleFile) {
                setState({
                  type: "error",
                  message: `A ${channel.charAt(0).toUpperCase() + channel.slice(1)} settlement CSV file is required.`,
                })
                return
              }

              if (!files.singleFile.name.toLowerCase().endsWith(".csv") || files.singleFile.size === 0) {
                setState({
                  type: "error",
                  message: "File must be a valid CSV file with content.",
                })
                return
              }

              startTransition(async () => {
                const payload = new FormData()
                payload.set("channel", channel)
                payload.set("file", files.singleFile!)

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

                setFiles({ b2c: null, returns: null, transactions: null, singleFile: null })
                router.refresh()
              })
            }
          }}
        >
          {channel === "amazon" ? (
            <>
              {/* Amazon: Three Files */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-200">Upload all three required files:</p>
                <div className="grid gap-4 md:grid-cols-3">
                  {/* B2C File Upload */}
                  <div>
                    <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-slate-950/40 p-4 text-center transition-colors hover:border-blue-400/50 hover:bg-slate-950/60">
                      <UploadCloud className="size-6 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-white">B2C File</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {files.b2c ? files.b2c.name : "MTR_B2C-*.csv"}
                        </p>
                      </div>
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.currentTarget.files?.[0]
                          if (file) {
                            setFiles((prev) => ({ ...prev, b2c: file }))
                            setState({ type: "idle" })
                          }
                        }}
                      />
                    </label>
                    {files.b2c && (
                      <button
                        type="button"
                        className="mt-2 flex w-full items-center justify-center gap-1 rounded text-xs text-slate-400 hover:text-slate-300"
                        onClick={() => setFiles((prev) => ({ ...prev, b2c: null }))}
                      >
                        <X className="size-3" />
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Returns File Upload */}
                  <div>
                    <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-slate-950/40 p-4 text-center transition-colors hover:border-blue-400/50 hover:bg-slate-950/60">
                      <UploadCloud className="size-6 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-white">Returns File</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {files.returns ? files.returns.name : "retrun*.csv"}
                        </p>
                      </div>
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.currentTarget.files?.[0]
                          if (file) {
                            setFiles((prev) => ({ ...prev, returns: file }))
                            setState({ type: "idle" })
                          }
                        }}
                      />
                    </label>
                    {files.returns && (
                      <button
                        type="button"
                        className="mt-2 flex w-full items-center justify-center gap-1 rounded text-xs text-slate-400 hover:text-slate-300"
                        onClick={() => setFiles((prev) => ({ ...prev, returns: null }))}
                      >
                        <X className="size-3" />
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Transactions File Upload */}
                  <div>
                    <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-slate-950/40 p-4 text-center transition-colors hover:border-blue-400/50 hover:bg-slate-950/60">
                      <UploadCloud className="size-6 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-white">Transactions File</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {files.transactions ? files.transactions.name : "*UnifiedTransaction.csv"}
                        </p>
                      </div>
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.currentTarget.files?.[0]
                          if (file) {
                            setFiles((prev) => ({ ...prev, transactions: file }))
                            setState({ type: "idle" })
                          }
                        }}
                      />
                    </label>
                    {files.transactions && (
                      <button
                        type="button"
                        className="mt-2 flex w-full items-center justify-center gap-1 rounded text-xs text-slate-400 hover:text-slate-300"
                        onClick={() => setFiles((prev) => ({ ...prev, transactions: null }))}
                      >
                        <X className="size-3" />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  disabled={isPending || !files.b2c || !files.returns || !files.transactions}
                >
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
                  Upload and Reconcile
                </Button>
                <p className="text-sm text-slate-400">
                  {files.b2c && files.returns && files.transactions
                    ? "Ready to upload all files"
                    : "Select all three files to proceed"}
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Flipkart/Myntra: Single File */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-200">Upload your settlement CSV file:</p>
                <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/15 bg-slate-950/40 p-6 text-center transition-colors hover:border-blue-400/50 hover:bg-slate-950/60">
                  <UploadCloud className="size-8 text-slate-400" />
                  <div>
                    <p className="font-medium text-white">
                      Drop a {channel.charAt(0).toUpperCase() + channel.slice(1)} CSV here or click to browse
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                      Required columns: marketplace, brand, order_id, payout_reference, settlement_date, total_received,
                      pending_settlement, refunds, disputes, status
                    </p>
                    {files.singleFile && <p className="mt-2 text-xs text-blue-300">Selected: {files.singleFile.name}</p>}
                  </div>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.currentTarget.files?.[0]
                      if (file) {
                        setFiles((prev) => ({ ...prev, singleFile: file }))
                        setState({ type: "idle" })
                      }
                    }}
                  />
                </label>
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={isPending || !files.singleFile}>
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
                  Upload and Reconcile
                </Button>
                <p className="text-sm text-slate-400">
                  {files.singleFile ? "Ready to upload" : "Select a file to proceed"}
                </p>
              </div>
            </>
          )}
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
