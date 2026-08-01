import { summarizeText } from "@/lib/ai/summarize";
import {
  SUMMARY_FAILED_MESSAGE,
  INVALID_SUMMARIZE_INPUT_MESSAGE,
} from "@/lib/constants";
import { NextResponse } from "next/server";

export const maxDuration = 60;

interface SummarizeBody {
  text?: unknown;
}

export async function POST(req: Request) {
  let body: SummarizeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: INVALID_SUMMARIZE_INPUT_MESSAGE },
      { status: 400 },
    );
  }

  if (typeof body.text !== "string" || !body.text.trim()) {
    return NextResponse.json(
      { error: INVALID_SUMMARIZE_INPUT_MESSAGE },
      { status: 400 },
    );
  }
  const text = body.text;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }
      try {
        const result = await summarizeText(text, (event) => send(event));
        send({ type: "done", summary: result.summary, points: result.points });
      } catch {
        send({ type: "error", message: SUMMARY_FAILED_MESSAGE });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
