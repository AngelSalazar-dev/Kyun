import { NextResponse } from "next/server";
import { personalities } from "@/lib/personalities";

export async function GET() {
  return NextResponse.json(personalities);
}
