import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

/** Serves the bundled fictional demo statement for one-click Try Demo Data. */
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "sample_transactions.csv");
    const csv = await readFile(filePath, "utf-8");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="sample-transactions.csv"',
      },
    });
  } catch {
    return NextResponse.json(
      { detail: "Demo data is missing (data/sample_transactions.csv not found)." },
      { status: 404 },
    );
  }
}
