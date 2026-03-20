import { promises as fs } from "fs"
import path from "path"
import { unstable_noStore as noStore } from "next/cache"

import {
  CHANNELS,
  getChannelConfig,
  normalizeChannel,
  type ChannelId,
  type ChannelSummary,
  type PaymentStatus,
  type SettlementRecord,
  type SettlementStore,
  type UploadBatch,
} from "@/lib/marketplace-shared"

const DATA_DIR = path.join(process.cwd(), "data")
const STORE_PATH = path.join(DATA_DIR, "settlements.json")

const COLUMN_ALIASES = {
  channel: ["channel", "marketplace", "market_place", "platform", "source_channel"],
  orderId: ["order_id", "orderid", "order_number", "order number", "reference_id", "transaction_id"],
  payoutReference: ["payout_reference", "utr", "settlement_id", "batch_id", "reference"],
  settlementDate: ["settlement_date", "date", "transaction_date", "order_date", "settled_on"],
  grossAmount: ["gross_amount", "gross", "amount", "order_amount"],
  totalReceived: ["total_received", "received", "amount_received", "net_amount", "settlement_amount", "net_settlement"],
  pendingSettlements: ["pending_settlements", "pending_settlement", "pending", "outstanding"],
  refunds: ["refunds", "refund_amount", "refund"],
  disputes: ["disputes", "dispute_amount", "chargeback", "chargebacks"],
  feeAmount: ["fee_amount", "fees", "commission", "marketplace_fee"],
  status: ["status", "payment_status", "settlement_status"],
  currency: ["currency"],
} as const

type CsvImportResult = {
  batch: UploadBatch
}

export async function getDashboardData() {
  noStore()

  const store = await readStore()
  const overall = summarizeRecords(store.records)
  const channels = CHANNELS.map((channel) => getChannelSummaryFromRecords(store.records, channel.id))
  const recentSettlements = [...store.records]
    .sort((left, right) => right.settlementDate.localeCompare(left.settlementDate))
    .slice(0, 12)
  const recentUploads = [...store.uploads]
    .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))
    .slice(0, 8)

  return {
    overall,
    channels,
    recentSettlements,
    recentUploads,
  }
}

export async function getChannelDashboard(channel: ChannelId) {
  noStore()

  const store = await readStore()
  const records = store.records
    .filter((record) => record.channel === channel)
    .sort((left, right) => right.settlementDate.localeCompare(left.settlementDate))
  const summary = getChannelSummaryFromRecords(store.records, channel)
  const uploads = store.uploads
    .filter((upload) => upload.channels.includes(channel))
    .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))
    .slice(0, 6)

  return {
    summary,
    records,
    uploads,
  }
}

export async function getUploadHistory() {
  noStore()

  const store = await readStore()
  return [...store.uploads].sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))
}

export async function importCsvFile(fileName: string, csvText: string): Promise<CsvImportResult> {
  const store = await readStore()
  const rows = parseCsv(csvText)

  if (rows.length <= 1) {
    throw new Error("The uploaded CSV is empty or only contains headers.")
  }

  const headers = rows[0]
  const now = new Date().toISOString()
  const nextRecords = [...store.records]
  const indexByUniqueKey = new Map(nextRecords.map((record, index) => [record.uniqueKey, index]))

  let insertedCount = 0
  let updatedCount = 0
  let skippedCount = 0
  const channels = new Set<ChannelId>()

  rows.slice(1).forEach((values) => {
    const row = headers.reduce<Record<string, string>>((accumulator, header, index) => {
      accumulator[header] = values[index] ?? ""
      return accumulator
    }, {})

    const mapped = mapRowToSettlement(row, fileName, now)

    if (!mapped) {
      skippedCount += 1
      return
    }

    channels.add(mapped.channel)

    const existingIndex = indexByUniqueKey.get(mapped.uniqueKey)
    if (existingIndex === undefined) {
      nextRecords.push(mapped)
      indexByUniqueKey.set(mapped.uniqueKey, nextRecords.length - 1)
      insertedCount += 1
      return
    }

    nextRecords[existingIndex] = {
      ...nextRecords[existingIndex],
      ...mapped,
      id: nextRecords[existingIndex].id,
      uploadedAt: now,
      rawRow: {
        ...nextRecords[existingIndex].rawRow,
        ...mapped.rawRow,
      },
    }
    updatedCount += 1
  })

  const batch: UploadBatch = {
    id: `upl_${Date.now()}`,
    fileName,
    uploadedAt: now,
    rowCount: rows.length - 1,
    insertedCount,
    updatedCount,
    skippedCount,
    channels: Array.from(channels),
  }

  const nextStore: SettlementStore = {
    records: nextRecords,
    uploads: [batch, ...store.uploads].slice(0, 50),
  }

  await writeStore(nextStore)

  return { batch }
}

async function readStore(): Promise<SettlementStore> {
  await ensureStore()

  const contents = await fs.readFile(STORE_PATH, "utf8")
  const parsed = JSON.parse(contents) as SettlementStore

  return {
    records: parsed.records ?? [],
    uploads: parsed.uploads ?? [],
  }
}

async function writeStore(store: SettlementStore) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8")
}

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true })

  try {
    await fs.access(STORE_PATH)
  } catch {
    const initialStore: SettlementStore = {
      records: [],
      uploads: [],
    }
    await fs.writeFile(STORE_PATH, JSON.stringify(initialStore, null, 2), "utf8")
  }
}

function summarizeRecords(records: SettlementRecord[]) {
  const currency = records[0]?.currency ?? "INR"

  return {
    totalReceived: sum(records, "totalReceived"),
    pendingSettlements: sum(records, "pendingSettlements"),
    refunds: sum(records, "refunds"),
    disputes: sum(records, "disputes"),
    settlementCount: records.length,
    currency,
  }
}

function getChannelSummaryFromRecords(records: SettlementRecord[], channel: ChannelId): ChannelSummary {
  const channelRecords = records.filter((record) => record.channel === channel)
  const config = getChannelConfig(channel)
  const lastSettlementDate = channelRecords[0]
    ? [...channelRecords].sort((left, right) => right.settlementDate.localeCompare(left.settlementDate))[0].settlementDate
    : null
  const lastUploadAt = channelRecords[0]
    ? [...channelRecords].sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))[0].uploadedAt
    : null

  return {
    channel,
    label: config.label,
    totalReceived: sum(channelRecords, "totalReceived"),
    pendingSettlements: sum(channelRecords, "pendingSettlements"),
    refunds: sum(channelRecords, "refunds"),
    disputes: sum(channelRecords, "disputes"),
    settlementCount: channelRecords.length,
    lastSettlementDate,
    lastUploadAt,
  }
}

function mapRowToSettlement(
  row: Record<string, string>,
  fileName: string,
  uploadedAt: string
): SettlementRecord | null {
  const channel =
    normalizeChannel(readValue(row, COLUMN_ALIASES.channel)) ?? normalizeChannel(fileName)

  if (!channel) {
    return null
  }

  const marketplaceLabel = getChannelConfig(channel).label
  const orderId = readValue(row, COLUMN_ALIASES.orderId) || `UNMAPPED-${Date.now()}`
  const payoutReference = readValue(row, COLUMN_ALIASES.payoutReference)
  const settlementDate = normalizeDate(
    readValue(row, COLUMN_ALIASES.settlementDate) || uploadedAt.slice(0, 10)
  )
  const grossAmount = parseAmount(readValue(row, COLUMN_ALIASES.grossAmount))
  const totalReceived = parseAmount(readValue(row, COLUMN_ALIASES.totalReceived))
  const pendingSettlements = parseAmount(readValue(row, COLUMN_ALIASES.pendingSettlements))
  const refunds = parseAmount(readValue(row, COLUMN_ALIASES.refunds))
  const disputes = parseAmount(readValue(row, COLUMN_ALIASES.disputes))
  const feeAmount = parseAmount(readValue(row, COLUMN_ALIASES.feeAmount))
  const currency = (readValue(row, COLUMN_ALIASES.currency) || "INR").toUpperCase()
  const status = inferStatus({
    status: readValue(row, COLUMN_ALIASES.status),
    pendingSettlements,
    refunds,
    disputes,
  })
  const normalizedGross =
    grossAmount || totalReceived + pendingSettlements + refunds + disputes + feeAmount

  const uniqueKey = [
    channel,
    orderId || "na",
    payoutReference || "na",
    settlementDate,
    normalizedGross.toFixed(2),
  ].join("|")

  return {
    id: `set_${uniqueKey.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20)}_${settlementDate.replace(/[^0-9]/g, "")}`,
    uniqueKey,
    channel,
    marketplaceLabel,
    orderId,
    payoutReference,
    settlementDate,
    grossAmount: normalizedGross,
    totalReceived,
    pendingSettlements,
    refunds,
    disputes,
    feeAmount,
    status,
    currency,
    sourceFile: fileName,
    uploadedAt,
    rawRow: row,
  }
}

function parseCsv(csvText: string) {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ""
  let insideQuotes = false

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index]
    const nextCharacter = csvText[index + 1]

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        currentCell += '"'
        index += 1
      } else {
        insideQuotes = !insideQuotes
      }
      continue
    }

    if (character === "," && !insideQuotes) {
      currentRow.push(currentCell.trim())
      currentCell = ""
      continue
    }

    if ((character === "\n" || character === "\r") && !insideQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1
      }

      currentRow.push(currentCell.trim())
      if (currentRow.some((value) => value.length > 0)) {
        rows.push(currentRow.map((value) => value.trim()))
      }
      currentRow = []
      currentCell = ""
      continue
    }

    currentCell += character
  }

  currentRow.push(currentCell.trim())
  if (currentRow.some((value) => value.length > 0)) {
    rows.push(currentRow.map((value) => value.trim()))
  }

  return rows
}

function readValue(
  row: Record<string, string>,
  aliases: readonly string[]
) {
  const normalizedEntries = Object.entries(row).map(([key, value]) => [normalizeHeader(key), value] as const)

  for (const alias of aliases) {
    const match = normalizedEntries.find(([key]) => key === normalizeHeader(alias))
    if (match && match[1]) {
      return match[1]
    }
  }

  return ""
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
}

function parseAmount(value: string) {
  const parsed = Number(value.replace(/[^0-9.-]+/g, ""))
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toISOString().slice(0, 10)
}

function inferStatus(input: {
  status: string
  pendingSettlements: number
  refunds: number
  disputes: number
}): PaymentStatus {
  const explicit = input.status.trim().toLowerCase()

  if (explicit.includes("dispute") || explicit.includes("chargeback")) return "disputed"
  if (explicit.includes("refund")) return "refunded"
  if (explicit.includes("pending")) return "pending"
  if (explicit.includes("partial")) return "partial"
  if (explicit.includes("received") || explicit.includes("settled") || explicit.includes("paid")) {
    return "received"
  }

  if (input.disputes > 0) return "disputed"
  if (input.refunds > 0 && input.pendingSettlements === 0) return "refunded"
  if (input.pendingSettlements > 0 && (input.refunds > 0 || input.disputes > 0)) return "partial"
  if (input.pendingSettlements > 0) return "pending"

  return "received"
}

function sum(
  records: SettlementRecord[],
  key: keyof Pick<SettlementRecord, "totalReceived" | "pendingSettlements" | "refunds" | "disputes">
) {
  return records.reduce((accumulator, record) => accumulator + record[key], 0)
}
