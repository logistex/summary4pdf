import { NextResponse } from "next/server";
import { summarizeText } from "@/lib/ai/summarize";
import {
  INVALID_RESUMMARIZE_INPUT_MESSAGE,
  RESUMMARIZE_FAILED_MESSAGE,
} from "@/lib/constants";

export const maxDuration = 60;

interface ResummarizeBody {
  summary?: unknown;
  points?: unknown;
}

export async function POST(req: Request) {
  let body: ResummarizeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: INVALID_RESUMMARIZE_INPUT_MESSAGE },
      { status: 400 },
    );
  }

  const { summary, points } = body;
  if (
    typeof summary !== "string" ||
    !summary.trim() ||
    !Array.isArray(points) ||
    points.length === 0 ||
    !points.every((p) => typeof p === "string")
  ) {
    return NextResponse.json(
      { error: INVALID_RESUMMARIZE_INPUT_MESSAGE },
      { status: 400 },
    );
  }

  const combinedText = [summary, ...points].join("\n");

  try {
    const result = await summarizeText(combinedText);
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: RESUMMARIZE_FAILED_MESSAGE },
      { status: 502 },
    );
  }
}
