import { extractText, getDocumentProxy } from "unpdf";

export interface ExtractResult {
  text: string;
  pageCount: number;
}

/**
 * 한글 등 CJK 문자를 담은 PDF는 pdf.js가 cmap 리소스를 읽어야 처리할 수 있다.
 * unpdf는 기본적으로 로컬 node_modules/pdfjs-dist를 file://로 직접 읽으려 하는데,
 * 이 방식은 Vercel의 서버리스 번들링(정적 분석으로 추적되지 않는 런타임 파일
 * 접근)과 일부 Node 런타임의 fetch() file:// 미지원 양쪽에서 실패한다(확인됨:
 * 로컬·프로덕션 배포 모두에서 재현). 그래서 cmap/표준 폰트 리소스를
 * public/pdfjs/ 아래 정적 파일로 함께 배포하고, 같은 배포 도메인으로 일반
 * http(s) fetch를 사용해 읽도록 명시적으로 지정한다 — 환경에 관계없이 동작한다.
 */
export async function extractPdfText(
  buffer: Buffer,
  baseUrl: string,
): Promise<ExtractResult> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer), {
    cMapUrl: `${baseUrl}/pdfjs/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${baseUrl}/pdfjs/standard_fonts/`,
  });
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  return { text: text.trim(), pageCount: totalPages };
}
