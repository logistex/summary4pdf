import { extractText, getDocumentProxy } from "unpdf";

export interface ExtractResult {
  text: string;
  pageCount: number;
}

/**
 * PDF 바이너리에서 텍스트와 페이지 수를 추출한다.
 * 텍스트 레이어가 없는 PDF(스캔 이미지 등)는 text가 빈 문자열일 수 있다 —
 * 호출부(API 라우트)가 빈 텍스트를 별도로 검사해 에러 처리한다.
 *
 * 한글 등 CJK 문자를 담은 PDF는 pdf.js가 cmap 리소스를 읽어야 처리할 수 있다.
 * unpdf는 로컬 node_modules/pdfjs-dist의 cmap/표준 폰트를 file://로 자동
 * resolve한다 — 이 파일들이 서버리스 함수 번들에 실제로 포함되도록
 * next.config.ts의 outputFileTracingIncludes에서 명시적으로 지정해 뒀다
 * (동적 경로 접근은 기본 파일 트레이싱으로 감지되지 않아 별도 지정이 필요함).
 */
export async function extractPdfText(buffer: Buffer): Promise<ExtractResult> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  return { text: text.trim(), pageCount: totalPages };
}
