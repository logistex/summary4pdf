import { NextResponse } from "next/server";
import { resummarizeText } from "@/lib/ai/summarize";
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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }
      try {
        const result = await resummarizeText(combinedText, (event) => send(event));
        send({
          type: "done",
          summary: result.summary,
          points: result.points,
          model: result.model,
        });
      } catch {
        send({ type: "error", message: RESUMMARIZE_FAILED_MESSAGE });
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
