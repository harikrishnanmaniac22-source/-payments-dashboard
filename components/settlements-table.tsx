"use client"

import { useMemo, useState } from "react"
import { AlertCircle, CheckCircle2, Clock3, RotateCcw, Search, Truck } from "lucide-react"

import { formatCurrency, formatDate, type SettlementRecord } from "@/lib/marketplace-shared"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const statusMap = {
  received: {
    label: "Received",
    icon: CheckCircle2,
    className: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  },
  pending: {
    label: "Pending",
    icon: Clock3,
    className: "border-amber-400/20 bg-amber-500/10 text-amber-200",
  },
  partial: {
    label: "Partial",
    icon: RotateCcw,
    className: "border-sky-400/20 bg-sky-500/10 text-sky-200",
  },
  refunded: {
    label: "Refunded",
    icon: RotateCcw,
    className: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  },
  disputed: {
    label: "Disputed",
    icon: AlertCircle,
    className: "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-200",
  },
  delivered: {
    label: "Delivered",
    icon: Truck,
    className: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  },
  rto: {
    label: "RTO",
    icon: RotateCcw,
    className: "border-amber-400/20 bg-amber-500/10 text-amber-200",
  },
  rtv: {
    label: "RTV",
    icon: RotateCcw,
    className: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  },
  not_delivered: {
    label: "Not Delivered",
    icon: Clock3,
    className: "border-slate-400/20 bg-slate-500/10 text-slate-200",
  },
} as const

interface SettlementsTableProps {
  title: string
  description: string
  records: SettlementRecord[]
  showChannel?: boolean
}

export function SettlementsTable({
  title,
  description,
  records,
  showChannel = false,
}: SettlementsTableProps) {
  const [query, setQuery] = useState("")

  const visibleRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return records
    }

    return records.filter((record) => {
      const haystacks = [
        record.orderId,
        record.sku ?? "",
        record.reconciliationKey ?? "",
        record.payoutReference,
      ]

      return haystacks.some((value) => value.toLowerCase().includes(normalizedQuery))
    })
  }, [query, records])

  const showSkuColumn = visibleRecords.some((record) => record.sku)
  const showInvoiceAmountColumn = visibleRecords.some((record) => typeof record.invoiceAmount === "number")

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
        <CardDescription className="text-slate-400">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
          <Search className="size-4 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by Order ID, SKU, payout reference, or reconciliation key"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
          <span className="text-xs text-slate-500">{visibleRecords.length} rows</span>
        </div>

        {visibleRecords.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-8 text-sm text-slate-400">
            {records.length === 0 ? "No settlements have been uploaded yet." : "No rows match the current search."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                {showChannel && <TableHead className="text-slate-300">Channel</TableHead>}
                <TableHead className="text-slate-300">Brand</TableHead>
                <TableHead className="text-slate-300">Order ID</TableHead>
                {showSkuColumn && <TableHead className="text-slate-300">SKU</TableHead>}
                <TableHead className="text-slate-300">Settlement Date</TableHead>
                {showInvoiceAmountColumn && <TableHead className="text-right text-slate-300">Invoice</TableHead>}
                <TableHead className="text-right text-slate-300">Received</TableHead>
                <TableHead className="text-right text-slate-300">Pending</TableHead>
                <TableHead className="text-right text-slate-300">Refunds</TableHead>
                <TableHead className="text-right text-slate-300">Disputes</TableHead>
                <TableHead className="text-slate-300">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRecords.map((record) => {
                const status = statusMap[record.status]
                const StatusIcon = status.icon

                return (
                  <TableRow key={record.id} className="border-white/5 hover:bg-white/5">
                    {showChannel && (
                      <TableCell className="font-medium text-slate-200">{record.marketplaceLabel}</TableCell>
                    )}
                    <TableCell className="font-medium text-slate-200 capitalize">{record.brand}</TableCell>
                    <TableCell className="font-medium text-white">{record.orderId}</TableCell>
                    {showSkuColumn && <TableCell className="text-slate-300">{record.sku ?? "-"}</TableCell>}
                    <TableCell className="text-slate-300">{formatDate(record.settlementDate)}</TableCell>
                    {showInvoiceAmountColumn && (
                      <TableCell className="text-right text-slate-200">
                        {formatCurrency(record.invoiceAmount ?? record.grossAmount)}
                      </TableCell>
                    )}
                    <TableCell className="text-right text-slate-200">{formatCurrency(record.totalReceived)}</TableCell>
                    <TableCell className="text-right text-amber-200">{formatCurrency(record.pendingSettlements)}</TableCell>
                    <TableCell className="text-right text-rose-200">{formatCurrency(record.refunds)}</TableCell>
                    <TableCell className="text-right text-fuchsia-200">{formatCurrency(record.disputes)}</TableCell>
                    <TableCell>
                      <Badge className={status.className}>
                        <StatusIcon className="mr-1 size-3" />
                        {status.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
