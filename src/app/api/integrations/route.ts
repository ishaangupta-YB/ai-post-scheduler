import { NextResponse } from "next/server"

export async function POST(req: Request) {
  // Empty integrations API route as requested
  return NextResponse.json({ success: true })
}
export async function GET(req: Request) {
  return NextResponse.json({ success: true, connected: [] })
}
