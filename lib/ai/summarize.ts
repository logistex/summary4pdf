import {
  chatCompletionWithFallback,
  type ChatMessage,
  type FallbackEventHandler,
} from "./openrouter";

export interface SummarizeResult {
  summary: string;
  points: string[];
  model: string;
}

/**
 * 무료 모델의 컨텍스트 길이 제한을 고려해 입력 텍스트를 안전한 길이로 자른다.
 * 20페이지 제한과 별개로, 모델 호출 자체의 안정성을 위한 추가 방어선이다.
 */
const MAX_INPUT_CHARS = 12_000;

/** 요약 목표 분량 비율(원문 대비). summary+points 합산 글자 수 기준. */
const TARGET_RATIO = 0.25;

function targetCharsFor(input: string): number {
  return Math.max(1, Math.round(input.length * TARGET_RATIO));
}

/**
 * 목표 글자 수에 여유를 두고 토큰 한도를 정한다. 일부 무료 모델은 글자 수
 * 목표가 주어지면 답을 내기 전에 길게 "계산 과정"을 늘어놓는 경향이 있어
 * (추론형 모델), 그 여유분까지 포함해 넉넉하게 잡는다.
 */
function maxTokensFor(targetChars: number): number {
  return Math.min(2000, Math.max(700, Math.round(targetChars * 2)));
}

const NO_REASONING_INSTRUCTION =
  "글자 수를 세거나 계산하는 과정, 설명, 인사말을 절대 출력하지 않는다. 다른 텍스트 없이 JSON 객체 하나만 바로 출력한다.";

function buildSystemPrompt(targetChars: number): string {
  return [
    "너는 한국어로 문서를 요약하는 어시스턴트다.",
    "사용자가 PDF에서 추출한 본문을 준다.",
    `summary와 points를 합친 전체 분량이 원문의 약 25%(약 ${targetChars}자 내외)가 되도록 요약한다.`,
    "다음 두 가지를 한국어로 만든다.",
    "1) summary: 문서 전체 핵심을 담은 한 문장 요약.",
    "2) points: 문서의 주요 내용을 담은 포인트 배열(목표 분량에 맞춰 개수와 길이를 조정하되 최소 3개).",
    NO_REASONING_INSTRUCTION,
    '{"summary":"...","points":["...","..."]}',
  ].join("\n");
}

/**
 * '반복 요약하기'용 프롬프트. 이미 한 번 요약된 결과를 입력으로 받으므로,
 * 같은 수준으로 바꿔 쓰지 않고 그 입력의 약 25%로 실제로 더 압축하도록 지시한다.
 */
function buildResummarizeSystemPrompt(targetChars: number): string {
  return [
    "너는 한국어로 이미 작성된 요약을 한 단계 더 압축하는 어시스턴트다.",
    "사용자가 이전 요약(한 줄 요약 + 포인트 목록)을 준다.",
    `summary와 points를 합친 전체 분량이 입력의 약 25%(약 ${targetChars}자 내외)가 되도록, 실제로 정보량을 줄여서 압축한다. 단순히 다른 표현으로 바꿔 쓰지 않는다.`,
    "다음 두 가지를 한국어로 만든다.",
    "1) summary: 입력보다 더 간결한 한 문장 요약.",
    "2) points: 가장 핵심적인 내용만 담은 포인트 배열(목표 분량에 맞춰 조정하되 최소 2개).",
    NO_REASONING_INSTRUCTION,
    '{"summary":"...","points":["...","..."]}',
  ].join("\n");
}

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
  buildPrompt: (targetChars: number) => string,
  minPoints: number,
  onEvent?: FallbackEventHandler,
): Promise<SummarizeResult> {
  const input = text.slice(0, MAX_INPUT_CHARS);
  const targetChars = targetCharsFor(input);
  const systemPrompt = buildPrompt(targetChars);
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: input },
  ];

  const { content: raw, model } = await chatCompletionWithFallback(
    messages,
    { max_tokens: maxTokensFor(targetChars) },
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
    model,
  };
}

/**
 * 추출된 PDF 텍스트를 OpenRouter 무료 모델 폴백 체인으로 요약한다.
 * 요약 분량은 원문의 약 25%를 목표로 한다.
 * 모든 무료 모델이 실패하거나 응답을 파싱할 수 없으면 예외를 던진다
 * (호출부인 /api/summarize 라우트가 잡아 처리한다).
 * onEvent가 주어지면 모델 시도/실패를 실시간으로 알려준다.
 */
export async function summarizeText(
  text: string,
  onEvent?: FallbackEventHandler,
): Promise<SummarizeResult> {
  return runSummarize(text, buildSystemPrompt, 3, onEvent);
}

/**
 * 이미 생성된 요약(한 줄 요약 + 포인트)을 한 단계 더 압축한다.
 * summarizeText와 동일하게 입력 대비 약 25% 분량을 목표로 하되, 더 낮은
 * 최소 포인트 개수(2개)를 사용해 반복할수록 실제로 짧아지도록 한다.
 * (호출부인 /api/resummarize 라우트가 잡아 처리한다).
 */
export async function resummarizeText(
  text: string,
  onEvent?: FallbackEventHandler,
): Promise<SummarizeResult> {
  return runSummarize(text, buildResummarizeSystemPrompt, 2, onEvent);
}
