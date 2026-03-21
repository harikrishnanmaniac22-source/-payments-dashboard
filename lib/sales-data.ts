import { promises as fs } from "fs"
import path from "path"

export interface SalesRecord {
  date: string
  channel: string
  productCategory: string
  unitsSold: number
  orders: number
  revenue: number
  discount: number
  returns: number
  adSpend: number
  netRevenue: number
  region: string
}

const SALES_CSV_PATH = path.join(process.cwd(), "public", "data", "sales-dashboard-30-days.csv")

export async function getSalesRecords() {
  const csvText = await fs.readFile(SALES_CSV_PATH, "utf8")
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const [header, ...rows] = lines
  const headers = header.split(",").map((value) => value.trim())

  return rows.map((line) => {
    const values = line.split(",").map((value) => value.trim())
    const row = headers.reduce<Record<string, string>>((accumulator, currentHeader, index) => {
      accumulator[currentHeader] = values[index] ?? ""
      return accumulator
    }, {})

    return {
      date: row["Date"],
      channel: row["Channel"],
      productCategory: row["Product Category"],
      unitsSold: Number(row["Units Sold"]),
      orders: Number(row["Orders"]),
      revenue: Number(row["Revenue"]),
      discount: Number(row["Discount"]),
      returns: Number(row["Returns"]),
      adSpend: Number(row["Ad Spend"]),
      netRevenue: Number(row["Net Revenue"]),
      region: row["Region"],
    } satisfies SalesRecord
  })
}
