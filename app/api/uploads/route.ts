import { NextResponse } from "next/server"

import { importCsvFile } from "@/lib/payment-data"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "A CSV file is required." }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json({ ok: false, error: "Only CSV uploads are supported." }, { status: 400 })
    }

    const csvText = Buffer.from(await file.arrayBuffer()).toString("utf8")
    const result = await importCsvFile(file.name, csvText)

    return NextResponse.json({
      ok: true,
      message: `${result.batch.fileName} processed successfully.`,
      details: `Inserted ${result.batch.insertedCount}, updated ${result.batch.updatedCount}, skipped ${result.batch.skippedCount}.`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected upload failure."
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
