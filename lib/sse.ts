/**
 * `text/event-stream` 응답 본문을 읽어 `data: ` 라인을 JSON으로 파싱해 콜백에 전달한다.
 * `EventSource`는 GET 요청만 지원하므로, POST로 받는 스트림은 직접 파싱한다.
 */
export async function readSSEStream(
  response: Response,
  onEvent: (data: unknown) => void,
): Promise<void> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const line = chunk.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      try {
        onEvent(JSON.parse(line.slice("data: ".length)));
      } catch {
        // 손상된 청크는 무시한다.
      }
    }
  }
}
