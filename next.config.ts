import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // unpdf(pdf.js)가 런타임에 동적 경로로 읽는 CJK cmap/표준 폰트 리소스는
  // 정적 분석 기반 파일 트레이싱으로 자동 감지되지 않아, 서버리스 함수 번들에서
  // 누락되곤 한다. 명시적으로 포함시켜 한글(CJK) PDF 텍스트 추출이 배포 환경에서도
  // 동작하게 한다.
  outputFileTracingIncludes: {
    "/api/summarize": [
      "./node_modules/pdfjs-dist/cmaps/**/*",
      "./node_modules/pdfjs-dist/standard_fonts/**/*",
    ],
  },
};

export default nextConfig;
