// OpenRouter 최소 클라이언트 (무료 모델 폴백 체인)
//
// - Node 내장 fetch로 OpenRouter의 OpenAI 호환 chat/completions 엔드포인트를 호출한다.
// - 여러 무료 모델을 순서대로 시도하는 폴백 체인을 둔다. 1순위가 429/5xx/네트워크
//   오류/타임아웃/응답검증 실패면 다음 무료 모델로 넘어간다.
// - 모델당 1회만 시도하고, 실패하면 곧바로 다음 모델로 넘어간다(지수 백오프 대신
//   "다른 무료 모델"로 폴백하는 편이 성공률·지연 모두 유리 — 형제 프로젝트에서 검증됨).
// - 인증 키(OPENROUTER_API_KEY)는 환경변수로만 읽고 로그에 절대 출력하지 않는다.
// - 유료 모델은 절대 사용하지 않는다. 아래 FREE_MODELS는 전부 :free(무료) 텍스트 모델이다.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * 무료 모델 폴백 체인(전부 OpenRouter `:free` 텍스트 모델, 유료 없음).
 * 앞에서부터 순서대로 시도하며, 실패하면 다음 모델로 넘어간다.
 * 2026-07-28 기준 OpenRouter `/api/v1/models`로 재확인 — 5개 전부 유효.
 */
export const FREE_MODELS = [
  "google/gemma-4-31b-it:free",
  "openai/gpt-oss-20b:free",
  "google/gemma-4-26b-a4b-it:free",
  "inclusionai/ling-3.0-flash:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
] as const;

export const DEFAULT_MODEL = FREE_MODELS[0];

const TIMEOUT_MS = 10_000;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatOptions {
  models?: readonly string[];
  temperature?: number;
  max_tokens?: number;
}

export interface ChatResult {
  content: string;
  model: string;
}

export interface FallbackEvent {
  type: "trying" | "failed";
  model: string;
  reason?: string;
}

export type FallbackEventHandler = (event: FallbackEvent) => void;

function debugLog(message: string): void {
  if (process.env.AI_DEBUG) {
    console.debug(`[ai/openrouter] ${message}`);
  }
}

async function requestModel(
  model: string,
  messages: ChatMessage[],
  apiKey: string,
  options: ChatOptions,
): Promise<string> {
  const body = JSON.stringify({
    model,
    messages,
    temperature: options.temperature ?? 0.5,
    max_tokens: options.max_tokens ?? 500,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body,
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("응답에 content가 없습니다.");
    }
    return content;
  } finally {
    clearTimeout(timer);
  }
}

export async function chatCompletionWithFallback(
  messages: ChatMessage[],
  options: ChatOptions = {},
  validate?: (content: string) => boolean,
  onEvent?: FallbackEventHandler,
): Promise<ChatResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY 환경변수가 설정되지 않았습니다.");
  }

  const models = options.models ?? FREE_MODELS;
  let lastError: unknown;

  for (const model of models) {
    onEvent?.({ type: "trying", model });
    try {
      const content = await requestModel(model, messages, apiKey, options);
      if (validate && !validate(content)) {
        lastError = new Error("응답 검증 실패(파싱 불가 등)");
        onEvent?.({ type: "failed", model, reason: "응답 검증 실패" });
        debugLog(`모델 응답 검증 실패, 다음 모델로 폴백: ${model}`);
        continue;
      }
      debugLog(`응답 성공 모델: ${model}`);
      return { content, model };
    } catch (err) {
      lastError = err;
      const reason = err instanceof Error ? err.message : "알 수 없는 오류";
      onEvent?.({ type: "failed", model, reason });
      debugLog(`모델 실패(${reason}), 다음 모델로 폴백: ${model}`);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("모든 무료 모델 호출에 실패했습니다.");
}
