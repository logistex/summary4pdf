import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PDF 요약",
  description: "PDF 문서를 업로드하면 AI가 핵심 내용을 요약해 줍니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
