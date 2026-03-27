export type ChannelId = "amazon" | "flipkart" | "myntra"

export type PaymentStatus =
  | "received"
  | "pending"
  | "partial"
  | "refunded"
  | "disputed"
  | "delivered"
  | "rto"
  | "rtv"
  | "not_delivered"
export type BrandId = "maniac" | "jumpcuts"

export interface SettlementRecord {
  id: string
  uniqueKey: string
  channel: ChannelId
  brand: BrandId
  marketplaceLabel: string
  orderId: string
  sku?: string
  invoiceAmount?: number
  reconciliationKey?: string
  payoutReference: string
  settlementDate: string
  grossAmount: number
  totalReceived: number
  pendingSettlements: number
  refunds: number
  disputes: number
  feeAmount: number
  status: PaymentStatus
  sourceFile: string
  uploadedAt: string
  rawRow?: Record<string, string>
}

export interface UploadBatch {
  id: string
  fileName: string
  uploadedAt: string
  rowCount: number
  insertedCount: number
  updatedCount: number
  skippedCount: number
  channels: ChannelId[]
}

export interface SettlementStore {
  records: SettlementRecord[]
  uploads: UploadBatch[]
  syncState?: {
    amazonFolderSignature?: string
  }
}

export interface ChannelSummary {
  channel: ChannelId
  label: string
  totalReceived: number
  pendingSettlements: number
  refunds: number
  disputes: number
  settlementCount: number
  lastSettlementDate: string | null
  lastUploadAt: string | null
}

export const CHANNELS: Array<{
  id: ChannelId
  label: string
  accentClass: string
  pillClass: string
}> = [
  {
    id: "amazon",
    label: "Amazon",
    accentClass: "from-amber-500/20 via-orange-500/10 to-transparent",
    pillClass: "bg-amber-500/15 text-amber-200 border-amber-400/20",
  },
  {
    id: "flipkart",
    label: "Flipkart",
    accentClass: "from-sky-500/20 via-blue-500/10 to-transparent",
    pillClass: "bg-sky-500/15 text-sky-200 border-sky-400/20",
  },
  {
    id: "myntra",
    label: "Myntra",
    accentClass: "from-pink-500/20 via-rose-500/10 to-transparent",
    pillClass: "bg-pink-500/15 text-pink-200 border-pink-400/20",
  },
]

export const BRANDS: Array<{
  id: BrandId
  label: string
}> = [
  { id: "maniac", label: "Maniac" },
  { id: "jumpcuts", label: "Jumpcuts" },
]

export function getChannelConfig(channel: ChannelId) {
  return CHANNELS.find((item) => item.id === channel) ?? CHANNELS[0]
}

export function isChannelId(value: string): value is ChannelId {
  return CHANNELS.some((channel) => channel.id === value)
}

export function normalizeChannel(value: string | null | undefined): ChannelId | null {
  if (!value) return null

  const normalized = value.trim().toLowerCase()

  if (normalized.includes("amazon")) return "amazon"
  if (normalized.includes("flipkart")) return "flipkart"
  if (normalized.includes("myntra")) return "myntra"

  return null
}

export function normalizeBrand(value: string | null | undefined): BrandId | null {
  if (!value) return null

  const normalized = value.trim().toLowerCase()

  if (normalized.includes("maniac")) return "maniac"
  if (normalized.includes("jumpcuts")) return "jumpcuts"

  return null
}

export function getBrandConfig(brand: BrandId) {
  return BRANDS.find((item) => item.id === brand) ?? BRANDS[0]
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatCompactCurrency(value: number) {
  const formatted = new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)

  return `Rs ${formatted}`
}

export function formatInteger(value: number) {
  return new Intl.NumberFormat("en-IN").format(Math.round(value))
}

export function formatDate(value: string | null) {
  if (!value) return "No activity yet"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function formatDateTime(value: string | null) {
  if (!value) return "No activity yet"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
