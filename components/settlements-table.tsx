import { AlertCircle, CheckCircle2, Clock3, RotateCcw } from "lucide-react"

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
  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
        <CardDescription className="text-slate-400">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-8 text-sm text-slate-400">
            No settlements have been uploaded yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                {showChannel && <TableHead className="text-slate-300">Channel</TableHead>}
                <TableHead className="text-slate-300">Order ID</TableHead>
                <TableHead className="text-slate-300">Settlement Date</TableHead>
                <TableHead className="text-right text-slate-300">Received</TableHead>
                <TableHead className="text-right text-slate-300">Pending</TableHead>
                <TableHead className="text-right text-slate-300">Refunds</TableHead>
                <TableHead className="text-right text-slate-300">Disputes</TableHead>
                <TableHead className="text-slate-300">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => {
                const status = statusMap[record.status]
                const StatusIcon = status.icon

                return (
                  <TableRow key={record.id} className="border-white/5 hover:bg-white/5">
                    {showChannel && (
                      <TableCell className="font-medium text-slate-200">{record.marketplaceLabel}</TableCell>
                    )}
                    <TableCell className="font-medium text-white">{record.orderId}</TableCell>
                    <TableCell className="text-slate-300">{formatDate(record.settlementDate)}</TableCell>
                    <TableCell className="text-right text-slate-200">
                      {formatCurrency(record.totalReceived, record.currency)}
                    </TableCell>
                    <TableCell className="text-right text-amber-200">
                      {formatCurrency(record.pendingSettlements, record.currency)}
                    </TableCell>
                    <TableCell className="text-right text-rose-200">
                      {formatCurrency(record.refunds, record.currency)}
                    </TableCell>
                    <TableCell className="text-right text-fuchsia-200">
                      {formatCurrency(record.disputes, record.currency)}
                    </TableCell>
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
