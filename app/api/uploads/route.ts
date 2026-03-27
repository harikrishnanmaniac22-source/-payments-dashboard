import { NextResponse } from "next/server"

import { importCsvFile, isCsvValidationError } from "@/lib/payment-data"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const channel = formData.get("channel") as string

    if (!channel || !["amazon", "flipkart", "myntra"].includes(channel)) {
      return NextResponse.json({ ok: false, error: "Invalid or missing channel." }, { status: 400 })
    }

    if (channel === "amazon") {
      const b2cFile = formData.get("b2c")
      const returnsFile = formData.get("returns")
      const transactionsFile = formData.get("transactions")

      if (!(b2cFile instanceof File)) {
        return NextResponse.json({ ok: false, error: "B2C file is required." }, { status: 400 })
      }

      if (!(returnsFile instanceof File)) {
        return NextResponse.json({ ok: false, error: "Returns file is required." }, { status: 400 })
      }

      if (!(transactionsFile instanceof File)) {
        return NextResponse.json({ ok: false, error: "Transactions file is required." }, { status: 400 })
      }

      // Validate all files are CSV
      const files = [b2cFile, returnsFile, transactionsFile]
      const fileLabels = ["B2C", "Returns", "Transactions"]

      for (let i = 0; i < files.length; i++) {
        if (!files[i].name.toLowerCase().endsWith(".csv")) {
          return NextResponse.json(
            { ok: false, error: `${fileLabels[i]} file must be a CSV file.` },
            { status: 400 }
          )
        }
      }

      // Process all three files
      let totalInserted = 0
      let totalUpdated = 0
      let totalSkipped = 0
      const allChannels = new Set<string>()

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const csvText = Buffer.from(await file.arrayBuffer()).toString("utf8")
        const result = await importCsvFile(file.name, csvText)

        totalInserted += result.batch.insertedCount
        totalUpdated += result.batch.updatedCount
        totalSkipped += result.batch.skippedCount
        result.batch.channels.forEach((c) => allChannels.add(c))
      }

      return NextResponse.json({
        ok: true,
        message: "All Amazon files processed successfully.",
        details: `Total inserted: ${totalInserted}, updated: ${totalUpdated}, skipped: ${totalSkipped} rows across ${allChannels.size} channels.`,
      })
    } else {
      // Flipkart or Myntra - single file
      const file = formData.get("file")

      if (!(file instanceof File)) {
        return NextResponse.json(
          { ok: false, error: `A ${channel.charAt(0).toUpperCase() + channel.slice(1)} CSV file is required.` },
          { status: 400 }
        )
      }

      if (!file.name.toLowerCase().endsWith(".csv")) {
        return NextResponse.json({ ok: false, error: "Only CSV files are supported." }, { status: 400 })
      }

      const csvText = Buffer.from(await file.arrayBuffer()).toString("utf8")
      const result = await importCsvFile(file.name, csvText)

      return NextResponse.json({
        ok: true,
        message: `${file.name} processed successfully.`,
        details: `Inserted ${result.batch.insertedCount}, updated ${result.batch.updatedCount}, skipped ${result.batch.skippedCount}.`,
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected upload failure."
    const status = isCsvValidationError(error) ? 400 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
