import {
  chatCompletionWithFallback,
  type ChatMessage,
  type FallbackEventHandler,
} from "./openrouter";

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

/**
 * '반복 요약하기'용 프롬프트. 이미 한 번 요약된 결과를 입력으로 받으므로,
 * 같은 수준으로 바꿔 쓰지 않고 실제로 더 압축(추상화 수준을 높이고 정보량을 줄임)하도록
 * 명시적으로 지시한다. 포인트 개수도 3~5개가 아니라 최대 3개로 줄여, 매 반복마다
 * 이전보다 짧아지는 것을 강제한다.
 */
const RESUMMARIZE_SYSTEM_PROMPT = [
  "너는 한국어로 이미 작성된 요약을 한 단계 더 압축하는 어시스턴트다.",
  "사용자가 이전 요약(한 줄 요약 + 포인트 목록)을 준다.",
  "단순히 다른 표현으로 바꿔 쓰지 말고, 실제로 정보량을 줄여서 이전 요약보다 더 짧고 핵심적으로 만든다.",
  "다음 두 가지를 한국어로 만든다.",
  "1) summary: 이전 요약보다 더 간결한 한 문장 요약(가능하면 더 짧게).",
  "2) points: 가장 핵심적인 내용만 담은 2~3개의 짧은 포인트 배열(이전 개수보다 늘리지 않는다).",
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

function extractValidPoints(points: unknown): string[] {
  if (!Array.isArray(points)) return [];
  return points.filter(
    (p): p is string => typeof p === "string" && p.trim().length > 0,
  );
}

function isValidParsed(
  parsed: { summary?: unknown; points?: unknown } | null,
  minPoints: number,
): boolean {
  if (!parsed || typeof parsed.summary !== "string" || parsed.summary.trim().length === 0) {
    return false;
  }
  return extractValidPoints(parsed.points).length >= minPoints;
}

async function runSummarize(
  text: string,
  systemPrompt: string,
  minPoints: number,
  onEvent?: FallbackEventHandler,
): Promise<SummarizeResult> {
  const input = text.slice(0, MAX_INPUT_CHARS);
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: input },
  ];

  const { content: raw } = await chatCompletionWithFallback(
    messages,
    { max_tokens: 500 },
    (text) => isValidParsed(parseModelJson(text), minPoints),
    onEvent,
  );

  const parsed = parseModelJson(raw);
  if (!parsed || !isValidParsed(parsed, minPoints) || typeof parsed.summary !== "string") {
    throw new Error("요약 응답 파싱 실패");
  }

  return {
    summary: parsed.summary,
    points: extractValidPoints(parsed.points),
  };
}

/**
 * 추출된 PDF 텍스트를 OpenRouter 무료 모델 폴백 체인으로 요약한다.
 * 모든 무료 모델이 실패하거나 응답을 파싱할 수 없으면 예외를 던진다
 * (호출부인 /api/summarize 라우트가 잡아 처리한다).
 * onEvent가 주어지면 모델 시도/실패를 실시간으로 알려준다.
 */
export async function summarizeText(
  text: string,
  onEvent?: FallbackEventHandler,
): Promise<SummarizeResult> {
  return runSummarize(text, SYSTEM_PROMPT, 3, onEvent);
}

/**
 * 이미 생성된 요약(한 줄 요약 + 포인트)을 한 단계 더 압축한다.
 * summarizeText와 달리 "더 짧게 압축하라"는 별도 프롬프트와 더 낮은
 * 최소 포인트 개수(2개)를 사용해, 반복할수록 실제로 짧아지도록 한다.
 * (호출부인 /api/resummarize 라우트가 잡아 처리한다).
 */
export async function resummarizeText(
  text: string,
  onEvent?: FallbackEventHandler,
): Promise<SummarizeResult> {
  return runSummarize(text, RESUMMARIZE_SYSTEM_PROMPT, 2, onEvent);
}
