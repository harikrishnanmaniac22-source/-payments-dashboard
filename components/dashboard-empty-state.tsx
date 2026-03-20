import { FileSpreadsheet } from "lucide-react"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

interface DashboardEmptyStateProps {
  title: string
  description: string
  schema: string
}

export function DashboardEmptyState({
  title,
  description,
  schema,
}: DashboardEmptyStateProps) {
  return (
    <Empty className="border border-dashed border-border bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileSpreadsheet className="size-5" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="w-full rounded-lg border border-border bg-muted/30 p-4 text-left font-mono text-xs">
          {schema}
        </div>
      </EmptyContent>
    </Empty>
  )
}
