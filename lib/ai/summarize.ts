export interface SummarizeResult {
  summary: string;
  points: string[];
}

/**
 * 임시 스텁 — 실제 요약이 아니라 입력 텍스트 앞부분을 잘라 되돌려준다.
 * API 라우트/프런트엔드를 먼저 엔드투엔드로 검증한 뒤, Task 5에서
 * OpenRouter 무료 모델 기반 실제 요약으로 내부 구현을 교체한다.
 * (export 시그니처는 고정 — 아래 함수 시그니처를 바꾸지 말 것.)
 */
export async function summarizeText(text: string): Promise<SummarizeResult> {
  const normalized = text.trim().replace(/\s+/g, " ");
  const summary = normalized.slice(0, 80) || "(내용 없음)";
  const points = [normalized.slice(0, 40) || "(내용 없음)"];
  return { summary, points };
}
