import { chatCompletionWithFallback, type ChatMessage } from "./openrouter";

export interface SummarizeResult {
  summary: string;
  points: string[];
}

/**
 * 무료 모델의 컨텍스트 길이 제한을 고려해 입력 텍스트를 안전한 길이로 자른다.
 * 20페이지 제한과 별개로, 모델 호출 자체의 안정성을 위한 추가 방어선이다.
 */
const MAX_INPUT_CHARS = 12_000;

const SYSTEM_PROMPT = [
  "너는 한국어로 문서를 요약하는 어시스턴트다.",
  "사용자가 PDF에서 추출한 본문을 준다.",
  "다음 두 가지를 한국어로 만든다.",
  "1) summary: 문서 전체 핵심을 담은 한 문장 요약.",
  "2) points: 문서의 주요 내용을 담은 3~5개의 짧은 포인트 배열.",
  "설명이나 인사말 없이 아래 형식의 JSON 객체 하나만 출력한다.",
  '{"summary":"...","points":["...","..."]}',
].join("\n");

function stripCodeFence(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fence ? fence[1] : text).trim();
}

function parseModelJson(
  raw: string,
): { summary?: unknown; points?: unknown } | null {
  const cleaned = stripCodeFence(raw);
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function isValidParsed(
  parsed: { summary?: unknown; points?: unknown } | null,
): parsed is { summary: string; points: unknown[] } {
  return (
    !!parsed &&
    typeof parsed.summary === "string" &&
    parsed.summary.trim().length > 0 &&
    Array.isArray(parsed.points)
  );
}

/**
 * 추출된 PDF 텍스트를 OpenRouter 무료 모델 폴백 체인으로 요약한다.
 * 모든 무료 모델이 실패하거나 응답을 파싱할 수 없으면 예외를 던진다
 * (호출부인 /api/summarize 라우트가 잡아 502로 응답한다).
 */
export async function summarizeText(text: string): Promise<SummarizeResult> {
  const input = text.slice(0, MAX_INPUT_CHARS);
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: input },
  ];

  const { content: raw } = await chatCompletionWithFallback(
    messages,
    { max_tokens: 500 },
    (text) => isValidParsed(parseModelJson(text)),
  );

  const parsed = parseModelJson(raw);
  if (!isValidParsed(parsed)) {
    throw new Error("요약 응답 파싱 실패");
  }

  return {
    summary: parsed.summary,
    points: parsed.points.filter((p): p is string => typeof p === "string"),
  };
}
