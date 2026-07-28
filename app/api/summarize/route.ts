import { NextResponse } from "next/server";
import { extractPdfText } from "@/lib/pdf/extract";
import { summarizeText } from "@/lib/ai/summarize";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_PAGE_COUNT,
  NOT_PDF_MESSAGE,
  SIZE_LIMIT_MESSAGE,
  EXTRACT_FAILED_MESSAGE,
  SUMMARY_FAILED_MESSAGE,
} from "@/lib/constants";

export const maxDuration = 60;

export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: NOT_PDF_MESSAGE }, { status: 400 });
  }
  const file = formData.get("file");

  if (!(file instanceof File) || file.type !== "application/pdf") {
    return NextResponse.json({ error: NOT_PDF_MESSAGE }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: SIZE_LIMIT_MESSAGE }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let extracted: { text: string; pageCount: number };
  try {
    extracted = await extractPdfText(buffer);
  } catch {
    return NextResponse.json({ error: EXTRACT_FAILED_MESSAGE }, { status: 400 });
  }

  if (extracted.pageCount > MAX_PAGE_COUNT) {
    return NextResponse.json({ error: SIZE_LIMIT_MESSAGE }, { status: 400 });
  }

  if (!extracted.text) {
    return NextResponse.json({ error: EXTRACT_FAILED_MESSAGE }, { status: 400 });
  }

  try {
    const result = await summarizeText(extracted.text);
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ error: SUMMARY_FAILED_MESSAGE }, { status: 502 });
  }
}
