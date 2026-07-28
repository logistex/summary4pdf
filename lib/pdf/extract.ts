import { extractText, getDocumentProxy } from "unpdf";
import { pathToFileURL } from "node:url";
import path from "node:path";

export interface ExtractResult {
  text: string;
  pageCount: number;
}

/**
 * 한글 등 CJK 문자를 담은 PDF는 pdf.js가 cmap 리소스를 읽어야 처리할 수 있다.
 * unpdf의 "로컬 pdfjs-dist를 자동으로 찾아 file://로 읽는" 기본 동작은 Next.js의
 * 서버리스 함수 번들 안에서는 동작하지 않는다(unpdf 내부 resolve 로직이 번들된
 * 모듈 그래프에서 pdfjs-dist 위치를 찾지 못함 — 확인됨). 그래서 cmap/표준 폰트
 * 경로를 process.cwd() 기준으로 직접 계산해 명시적으로 넘긴다. 이 파일들이
 * 함수 번들에 실제로 포함되도록 next.config.ts의 outputFileTracingIncludes에도
 * 등록해 뒀다(동적 경로 접근은 기본 파일 트레이싱으로 감지되지 않음).
 */
const PDFJS_DIST_DIR = path.join(process.cwd(), "node_modules", "pdfjs-dist");
const CMAP_URL = `${pathToFileURL(path.join(PDFJS_DIST_DIR, "cmaps")).href}/`;
const STANDARD_FONT_DATA_URL = `${pathToFileURL(path.join(PDFJS_DIST_DIR, "standard_fonts")).href}/`;

/**
 * PDF 바이너리에서 텍스트와 페이지 수를 추출한다.
 * 텍스트 레이어가 없는 PDF(스캔 이미지 등)는 text가 빈 문자열일 수 있다 —
 * 호출부(API 라우트)가 빈 텍스트를 별도로 검사해 에러 처리한다.
 */
export async function extractPdfText(buffer: Buffer): Promise<ExtractResult> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer), {
    cMapUrl: CMAP_URL,
    cMapPacked: true,
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
  });
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  return { text: text.trim(), pageCount: totalPages };
}
