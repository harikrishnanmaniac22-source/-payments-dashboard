import { promises as fs } from "fs"
import path from "path"
import { unstable_noStore as noStore } from "next/cache"

import {
  CHANNELS,
  getChannelConfig,
  normalizeBrand,
  normalizeChannel,
  type BrandId,
  type ChannelId,
  type ChannelSummary,
  type PaymentStatus,
  type SettlementRecord,
  type SettlementStore,
  type UploadBatch,
} from "@/lib/marketplace-shared"

const DATA_DIR = path.join(process.cwd(), "data")
const STORE_PATH = path.join(DATA_DIR, "settlements.json")
const AMAZON_DATA_DIR = path.join(process.cwd(), "amazon data")
const AMAZON_FOLDER_BATCH_NAME = "amazon data folder sync"
const AMAZON_FOLDER_SOURCE_PREFIX = "amazon-folder:"
const AMAZON_SYNC_VERSION = "v2"
const AMAZON_B2C_FILE = "MTR_B2C-FEBRUARY-2026-A3VQ5XYGQ22AYC.csv"
const AMAZON_UNIFIED_FILE = "2026Jan1-2026Mar8CustomUnifiedTransaction.csv"
const AMAZON_RETURN_FILE = "retrun Az.csv"
const AMAZON_RTO_REASONS = new Set([
  "UNDELIVERABLE_UNKNOWN",
  "UNDELIVERABLE_REFUSED",
  "UNWANTED_ITEM",
])

let storeCache:
  | {
      mtimeMs: number
      size: number
      store: SettlementStore
    }
  | null = null

const COLUMN_ALIASES = {
  channel: ["channel", "marketplace", "market_place", "platform", "source_channel"],
  orderId: ["order_id", "orderid", "order_number", "order number", "reference_id", "transaction_id"],
  sku: ["sku", "sku_id", "msku", "seller_sku", "item_sku"],
  payoutReference: ["payout_reference", "utr", "settlement_id", "batch_id", "reference"],
  settlementDate: ["settlement_date", "date", "transaction_date", "order_date", "settled_on"],
  grossAmount: ["gross_amount", "gross", "amount", "order_amount", "invoice_amount", "invoice value"],
  totalReceived: ["total_received", "received", "amount_received", "net_amount", "settlement_amount", "net_settlement", "settlement"],
  pendingSettlements: ["pending_settlements", "pending_settlement", "pending", "outstanding"],
  refunds: ["refunds", "refund_amount", "refund"],
  disputes: ["disputes", "dispute_amount", "chargeback", "chargebacks"],
  feeAmount: ["fee_amount", "fees", "commission", "marketplace_fee"],
  status: ["status", "payment_status", "settlement_status"],
  brand: ["brand", "brand_name", "label"],
} as const

type CsvImportResult = {
  batch: UploadBatch
}

class CsvValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CsvValidationError"
  }
}

export async function getDashboardData() {
  noStore()

  const store = await readStore()
  const viewRecords = toViewRecords(store.records)
  const overall = summarizeRecords(viewRecords)
  const channels = CHANNELS.map((channel) => getChannelSummaryFromRecords(viewRecords, channel.id))
  const recentSettlements = [...viewRecords]
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

export async function getAllSettlementRecords() {
  noStore()

  const store = await readStore()
  return toViewRecords(store.records).sort((left, right) => right.settlementDate.localeCompare(left.settlementDate))
}

export async function getChannelDashboard(channel: ChannelId) {
  noStore()

  const store = await readStore()
  const viewRecords = toViewRecords(store.records)
  const records = viewRecords
    .filter((record) => record.channel === channel)
    .sort((left, right) => right.settlementDate.localeCompare(left.settlementDate))
  const summary = getChannelSummaryFromRecords(viewRecords, channel)
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
  validateUniqueOrderIds(rows, headers, fileName)
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

export function isCsvValidationError(error: unknown): error is CsvValidationError {
  return error instanceof CsvValidationError
}

async function readStore(): Promise<SettlementStore> {
  await ensureStore()

  const stat = await fs.stat(STORE_PATH)
  if (storeCache && storeCache.mtimeMs === stat.mtimeMs && storeCache.size === stat.size) {
    return storeCache.store
  }

  const contents = await fs.readFile(STORE_PATH, "utf8")
  const parsed = JSON.parse(contents) as SettlementStore
  const normalizedStore: SettlementStore = {
    records: (parsed.records ?? []).map((record) => ({
      ...compactRecord(record),
      brand: normalizeBrand((record as SettlementRecord & { brand?: string }).brand) ?? inferBrandFromRecord(record),
    })),
    uploads: parsed.uploads ?? [],
    syncState: parsed.syncState ?? {},
  }

  const syncedStore = await syncAmazonFolderStore(normalizedStore)
  if (storeNeedsCompaction(parsed)) {
    await writeStore(syncedStore)
  }
  const syncedStat = await fs.stat(STORE_PATH)

  storeCache = {
    mtimeMs: syncedStat.mtimeMs,
    size: syncedStat.size,
    store: syncedStore,
  }

  return syncedStore
}

async function writeStore(store: SettlementStore) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  const compactStore: SettlementStore = {
    ...store,
    records: store.records.map((record) => compactRecord(record)),
  }
  await fs.writeFile(STORE_PATH, JSON.stringify(compactStore, null, 2), "utf8")
  const stat = await fs.stat(STORE_PATH)
  storeCache = {
    mtimeMs: stat.mtimeMs,
    size: stat.size,
    store: compactStore,
  }
}

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true })

  try {
    await fs.access(STORE_PATH)
  } catch {
    const initialStore: SettlementStore = {
      records: [],
      uploads: [],
      syncState: {},
    }
    await fs.writeFile(STORE_PATH, JSON.stringify(initialStore, null, 2), "utf8")
  }
}

async function syncAmazonFolderStore(store: SettlementStore): Promise<SettlementStore> {
  const files = [
    path.join(AMAZON_DATA_DIR, AMAZON_B2C_FILE),
    path.join(AMAZON_DATA_DIR, AMAZON_UNIFIED_FILE),
    path.join(AMAZON_DATA_DIR, AMAZON_RETURN_FILE),
  ]

  try {
    const stats = await Promise.all(files.map((filePath) => fs.stat(filePath)))
    const signature = stats
      .map((stat, index) => `${path.basename(files[index])}:${stat.size}:${stat.mtimeMs}`)
      .concat(AMAZON_SYNC_VERSION)
      .join("|")

    if (store.syncState?.amazonFolderSignature === signature) {
      return store
    }

    const amazonRecords = await buildAmazonFolderRecords()
    const retainedRecords = store.records.filter((record) => record.channel !== "amazon")
    const retainedUploads = store.uploads.filter(
      (upload) => upload.fileName !== AMAZON_FOLDER_BATCH_NAME && !upload.channels.includes("amazon")
    )

    const nextStore: SettlementStore = {
      records: [...amazonRecords, ...retainedRecords],
      uploads: [
        {
          id: `upl_amazon_folder_${Date.now()}`,
          fileName: AMAZON_FOLDER_BATCH_NAME,
          uploadedAt: new Date().toISOString(),
          rowCount: amazonRecords.length,
          insertedCount: amazonRecords.length,
          updatedCount: 0,
          skippedCount: 0,
          channels: ["amazon" as const],
        },
        ...retainedUploads,
      ].slice(0, 50),
      syncState: {
        ...store.syncState,
        amazonFolderSignature: signature,
      },
    }

    await writeStore(nextStore)
    return nextStore
  } catch {
    return store
  }
}

async function buildAmazonFolderRecords(): Promise<SettlementRecord[]> {
  const [b2cText, unifiedText, returnText] = await Promise.all([
    fs.readFile(path.join(AMAZON_DATA_DIR, AMAZON_B2C_FILE), "utf8"),
    fs.readFile(path.join(AMAZON_DATA_DIR, AMAZON_UNIFIED_FILE), "utf8"),
    fs.readFile(path.join(AMAZON_DATA_DIR, AMAZON_RETURN_FILE), "utf8"),
  ])

  const b2cRows = parseCsvRows(b2cText)
  const unifiedRows = parseCsvRows(unifiedText).slice(11)
  const returnRows = parseCsvRows(returnText)

  if (b2cRows.length <= 1 || unifiedRows.length <= 1 || returnRows.length <= 1) {
    return []
  }

  const b2c = rowsToObjects(b2cRows)
  const unified = rowsToObjects(unifiedRows)
  const returns = rowsToObjects(returnRows)

  const firstSkuByOrder = new Map<string, string>()
  b2c.forEach((row) => {
    const orderId = readAmazonValue(row, "Order Id")
    const sku = readAmazonValue(row, "Sku")

    if (orderId && sku && !firstSkuByOrder.has(orderId)) {
      firstSkuByOrder.set(orderId, sku)
    }
  })

  const unifiedByPair = new Map<
    string,
    {
      settlement: number
      latestDate: string
      count: number
    }
  >()

  unified.forEach((row) => {
    const orderId = readAmazonValue(row, "order id")
    const sku = readAmazonValue(row, "Sku")

    if (!orderId || !sku) {
      return
    }

    const pairKey = `${orderId}|${sku}`
    const current = unifiedByPair.get(pairKey) ?? {
      settlement: 0,
      latestDate: "",
      count: 0,
    }

    const settlement = parseAmount(readAmazonValue(row, "total"))
    const normalizedDate = normalizeDate(readAmazonValue(row, "date/time"))

    current.settlement += settlement
    current.count += 1
    if (!current.latestDate || normalizedDate > current.latestDate) {
      current.latestDate = normalizedDate
    }

    unifiedByPair.set(pairKey, current)
  })

  const returnByPair = new Map<
    string,
    {
      reason: string
      returnDate: string
    }
  >()

  returns.forEach((row) => {
    const orderId = readAmazonValue(row, "order-id")
    const sku = readAmazonValue(row, "sku")

    if (!orderId || !sku || returnByPair.has(`${orderId}|${sku}`)) {
      return
    }

    returnByPair.set(`${orderId}|${sku}`, {
      reason: readAmazonValue(row, "reason"),
      returnDate: normalizeDate(readAmazonValue(row, "return-date")),
    })
  })

  const records: SettlementRecord[] = []

  b2c
    .filter((row) => readAmazonValue(row, "Transaction Type").toLowerCase() === "shipment")
    .forEach((row, index) => {
      const orderId = readAmazonValue(row, "Order Id")
      const rawSku = readAmazonValue(row, "Sku")
      const sku = rawSku || firstSkuByOrder.get(orderId) || ""

      if (!orderId || !sku) {
        return
      }

      const pairKey = `${orderId}|${sku}`
      const unifiedMatch = unifiedByPair.get(pairKey)
      const returnMatch = returnByPair.get(pairKey)
      const invoiceAmount = Math.abs(parseAmount(readAmazonValue(row, "Invoice Amount")))
      const quantity = Math.max(1, Math.abs(parseAmount(readAmazonValue(row, "Quantity"))))
      const status = unifiedMatch
        ? "delivered"
        : returnMatch
          ? AMAZON_RTO_REASONS.has(returnMatch.reason.toUpperCase())
            ? "rto"
            : "rtv"
          : "not_delivered"
      const totalReceived = unifiedMatch ? unifiedMatch.settlement : 0
      const refunds = status === "rtv" ? invoiceAmount : 0
      const pendingSettlements = status === "not_delivered" || status === "rto" ? invoiceAmount : 0
      const settlementDate =
        unifiedMatch?.latestDate ||
        returnMatch?.returnDate ||
        normalizeDate(readAmazonValue(row, "Shipment Date")) ||
        normalizeDate(readAmazonValue(row, "Order Date")) ||
        normalizeDate(readAmazonValue(row, "Invoice Date"))
      const brand = inferBrandFromAmazonRow({
        sku,
        description: readAmazonValue(row, "Item Description"),
        fileName: AMAZON_B2C_FILE,
        orderId,
      })
      const uniqueKey = [
        "amazon",
        orderId,
        sku,
        status,
        totalReceived.toFixed(2),
        settlementDate,
        index,
      ].join("|")

      records.push({
        id: `set_${hashString(uniqueKey).toString(16)}`,
        uniqueKey,
        channel: "amazon" as const,
        brand,
        marketplaceLabel: "Amazon",
        orderId,
        sku,
        invoiceAmount,
        reconciliationKey: `${orderId}|""|${sku}|${totalReceived.toFixed(2)}|${status}`,
        payoutReference: pairKey,
        settlementDate,
        grossAmount: invoiceAmount,
        totalReceived,
        pendingSettlements,
        refunds,
        disputes: 0,
        feeAmount: Math.max(invoiceAmount - Math.max(totalReceived, 0), 0),
        status,
        sourceFile: `${AMAZON_FOLDER_SOURCE_PREFIX}${AMAZON_B2C_FILE}`,
        uploadedAt: new Date().toISOString(),
        rawRow: undefined,
      })
    })

  return records
}

function parseCsvRows(csvText: string) {
  return parseCsv(csvText)
}

function rowsToObjects(rows: string[][]) {
  const [headers, ...dataRows] = rows

  return dataRows.map((values) =>
    headers.reduce<Record<string, string>>((accumulator, header, index) => {
      const safeHeader = header || `column_${index + 1}`
      accumulator[safeHeader] = values[index] ?? ""
      return accumulator
    }, {})
  )
}

function readAmazonValue(row: Record<string, string>, header: string) {
  return row[header] ?? ""
}

function summarizeRecords(records: SettlementRecord[]) {
  return {
    totalReceived: sum(records, "totalReceived"),
    pendingSettlements: sum(records, "pendingSettlements"),
    refunds: sum(records, "refunds"),
    disputes: sum(records, "disputes"),
    settlementCount: records.length,
  }
}

function toViewRecords(records: SettlementRecord[]) {
  return records.map((record) => ({
    ...record,
    rawRow: undefined,
  }))
}

function compactRecord(record: SettlementRecord) {
  return {
    ...record,
    rawRow: undefined,
  }
}

function storeNeedsCompaction(store: SettlementStore) {
  return (store.records ?? []).some((record) => record.rawRow && Object.keys(record.rawRow).length > 0)
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
  const sku = readValue(row, COLUMN_ALIASES.sku)
  const payoutReference = readValue(row, COLUMN_ALIASES.payoutReference)
  const settlementDate = normalizeDate(
    readValue(row, COLUMN_ALIASES.settlementDate) || uploadedAt.slice(0, 10)
  )
  const grossAmount = parseAmount(readValue(row, COLUMN_ALIASES.grossAmount))
  const explicitStatus = readValue(row, COLUMN_ALIASES.status)
  const normalizedStatus = inferStatus({
    status: explicitStatus,
    pendingSettlements: parseAmount(readValue(row, COLUMN_ALIASES.pendingSettlements)),
    refunds: parseAmount(readValue(row, COLUMN_ALIASES.refunds)),
    disputes: parseAmount(readValue(row, COLUMN_ALIASES.disputes)),
  })
  const parsedSettlement = parseAmount(readValue(row, COLUMN_ALIASES.totalReceived))
  const totalReceived = parsedSettlement
  const pendingSettlements = derivePendingSettlements({
    explicitPending: parseAmount(readValue(row, COLUMN_ALIASES.pendingSettlements)),
    grossAmount,
    totalReceived,
    status: normalizedStatus,
  })
  const refunds = deriveRefunds({
    explicitRefunds: parseAmount(readValue(row, COLUMN_ALIASES.refunds)),
    grossAmount,
    status: normalizedStatus,
  })
  const disputes = parseAmount(readValue(row, COLUMN_ALIASES.disputes))
  const feeAmount = parseAmount(readValue(row, COLUMN_ALIASES.feeAmount))
  const brand =
    normalizeBrand(readValue(row, COLUMN_ALIASES.brand)) ??
    inferBrandFromRow({ channel, fileName, orderId })
  const status = normalizedStatus
  const normalizedGross =
    grossAmount || totalReceived + pendingSettlements + refunds + disputes + feeAmount
  const reconciliationKey = [orderId || "na", sku || "", totalReceived.toFixed(2), status].join("|")

  const uniqueKey = [
    channel,
    orderId || "na",
    sku || "na",
    payoutReference || "na",
    status,
    totalReceived.toFixed(2),
    settlementDate,
  ].join("|")

  return {
    id: `set_${uniqueKey.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20)}_${settlementDate.replace(/[^0-9]/g, "")}`,
    uniqueKey,
    channel,
    marketplaceLabel,
    orderId,
    sku: sku || undefined,
    invoiceAmount: normalizedGross,
    reconciliationKey,
    payoutReference,
    settlementDate,
    grossAmount: normalizedGross,
    totalReceived,
    pendingSettlements,
    refunds,
    disputes,
    feeAmount,
    status,
    brand,
    sourceFile: fileName,
    uploadedAt,
    rawRow: undefined,
  }
}

function validateUniqueOrderIds(
  rows: string[][],
  headers: string[],
  fileName: string
) {
  const seenRowKeys = new Map<string, number>()

  rows.slice(1).forEach((values, index) => {
    const rowNumber = index + 2
    const row = headers.reduce<Record<string, string>>((accumulator, header, headerIndex) => {
      accumulator[header] = values[headerIndex] ?? ""
      return accumulator
    }, {})

    const channel =
      normalizeChannel(readValue(row, COLUMN_ALIASES.channel)) ?? normalizeChannel(fileName)
    const orderId = readValue(row, COLUMN_ALIASES.orderId)
    const sku = readValue(row, COLUMN_ALIASES.sku)
    const status = inferStatus({
      status: readValue(row, COLUMN_ALIASES.status),
      pendingSettlements: parseAmount(readValue(row, COLUMN_ALIASES.pendingSettlements)),
      refunds: parseAmount(readValue(row, COLUMN_ALIASES.refunds)),
      disputes: parseAmount(readValue(row, COLUMN_ALIASES.disputes)),
    })
    const settlement = parseAmount(readValue(row, COLUMN_ALIASES.totalReceived)).toFixed(2)

    if (!channel || !orderId) {
      return
    }

    const uniqueOrderKey = [channel, orderId.trim().toLowerCase(), sku.trim().toLowerCase(), status, settlement].join("|")
    const firstSeenRow = seenRowKeys.get(uniqueOrderKey)

    if (firstSeenRow !== undefined) {
      throw new CsvValidationError(
        `Duplicate reconciliation row for order_id "${orderId}"${sku ? ` and sku "${sku}"` : ""} found for ${channel} in rows ${firstSeenRow} and ${rowNumber}. Each order + sku + settlement + status combination must be unique within the same upload.`
      )
    }

    seenRowKeys.set(uniqueOrderKey, rowNumber)
  })
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
  const trimmed = value.trim()
  if (!trimmed) {
    return ""
  }

  const dayFirstMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s|$)/)
  if (dayFirstMatch) {
    const [, day, month, year] = dayFirstMatch
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }

  const utcSuffixDate = new Date(trimmed.replace(" UTC", "Z"))
  if (!Number.isNaN(utcSuffixDate.getTime())) {
    return utcSuffixDate.toISOString().slice(0, 10)
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return trimmed
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
  if (explicit.includes("not delivered") || explicit.includes("not_delivered")) return "not_delivered"
  if (explicit === "rto" || explicit.includes("undeliverable")) return "rto"
  if (explicit === "rtv") return "rtv"
  if (explicit.includes("deliver")) return "delivered"
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

function derivePendingSettlements(input: {
  explicitPending: number
  grossAmount: number
  totalReceived: number
  status: PaymentStatus
}) {
  if (input.explicitPending > 0) {
    return input.explicitPending
  }

  if (input.status === "rto" || input.status === "rtv" || input.status === "not_delivered") {
    return Math.max(input.grossAmount - input.totalReceived, input.grossAmount || 0)
  }

  return Math.max(input.grossAmount - input.totalReceived, 0)
}

function deriveRefunds(input: {
  explicitRefunds: number
  grossAmount: number
  status: PaymentStatus
}) {
  if (input.explicitRefunds > 0) {
    return input.explicitRefunds
  }

  if (input.status === "rtv") {
    return input.grossAmount
  }

  return 0
}

function inferBrandFromAmazonRow(input: {
  sku: string
  description: string
  fileName: string
  orderId: string
}): BrandId {
  const sku = input.sku.trim().toLowerCase()
  const description = input.description.trim().toLowerCase()

  if (description.includes("maniac")) {
    return "maniac"
  }

  if (description.includes("jumpcuts") || description.includes("jump cuts")) {
    return "jumpcuts"
  }

  if (sku.startsWith("mn") || sku.startsWith("jmn") || sku.startsWith("wmn")) {
    return "maniac"
  }

  if (sku.startsWith("jc") || sku.startsWith("njc")) {
    return "jumpcuts"
  }

  return inferBrandFromRow({
    channel: "amazon",
    fileName: input.fileName,
    orderId: input.orderId,
  })
}

function inferBrandFromRow(input: {
  channel: ChannelId
  fileName: string
  orderId: string
}): BrandId {
  const fromFile = normalizeBrand(input.fileName)
  if (fromFile) return fromFile

  const seed = `${input.channel}|${input.orderId}`.toLowerCase()
  return hashString(seed) % 2 === 0 ? "maniac" : "jumpcuts"
}

function inferBrandFromRecord(
  record: Pick<SettlementRecord, "channel" | "sourceFile" | "orderId">
): BrandId {
  return inferBrandFromRow({
    channel: record.channel,
    fileName: record.sourceFile,
    orderId: record.orderId,
  })
}

function hashString(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }

  return hash
}

function sum(
  records: SettlementRecord[],
  key: keyof Pick<SettlementRecord, "totalReceived" | "pendingSettlements" | "refunds" | "disputes">
) {
  return records.reduce((accumulator, record) => accumulator + record[key], 0)
}
