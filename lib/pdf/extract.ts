import { extractText, getDocumentProxy } from "unpdf";

export interface ExtractResult {
  text: string;
  pageCount: number;
}

/**
 * PDF 바이너리에서 텍스트와 페이지 수를 추출한다.
 * 텍스트 레이어가 없는 PDF(스캔 이미지 등)는 text가 빈 문자열일 수 있다 —
 * 호출부(API 라우트)가 빈 텍스트를 별도로 검사해 에러 처리한다.
 */
export async function extractPdfText(buffer: Buffer): Promise<ExtractResult> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  return { text: text.trim(), pageCount: totalPages };
}
