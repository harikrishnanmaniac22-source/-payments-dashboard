"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface Transaction {
  id: string
  orderId: string
  date: string
  amount: number
  status: "completed" | "pending" | "processing" | "failed"
  customer?: string
  type?: string
}

interface DataTableProps {
  data: Transaction[]
  showCustomer?: boolean
  showType?: boolean
}

const statusStyles = {
  completed: "bg-success/20 text-success border-success/30",
  pending: "bg-warning/20 text-warning border-warning/30",
  processing: "bg-info/20 text-info border-info/30",
  failed: "bg-destructive/20 text-destructive border-destructive/30",
}

export function DataTable({ data, showCustomer = true, showType = false }: DataTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border">
            <TableHead className="text-muted-foreground">Order ID</TableHead>
            {showCustomer && (
              <TableHead className="text-muted-foreground">Customer</TableHead>
            )}
            {showType && (
              <TableHead className="text-muted-foreground">Type</TableHead>
            )}
            <TableHead className="text-muted-foreground">Date</TableHead>
            <TableHead className="text-muted-foreground text-right">Amount</TableHead>
            <TableHead className="text-muted-foreground">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((transaction) => (
            <TableRow key={transaction.id} className="border-border">
              <TableCell className="font-mono text-sm">
                {transaction.orderId}
              </TableCell>
              {showCustomer && (
                <TableCell>{transaction.customer || "—"}</TableCell>
              )}
              {showType && (
                <TableCell>{transaction.type || "—"}</TableCell>
              )}
              <TableCell className="text-muted-foreground">
                {transaction.date}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(transaction.amount)}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    "capitalize font-normal",
                    statusStyles[transaction.status]
                  )}
                >
                  {transaction.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
