"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./PdfThumbnail.module.css";

interface Props {
  file: File;
}

const THUMBNAIL_WIDTH = 300;

export default function PdfThumbnail({ file }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      setError(false);
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = THUMBNAIL_WIDTH / baseViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext("2d");
        if (!context) return;

        await page.render({ canvasContext: context, viewport, canvas }).promise;
      } catch {
        if (!cancelled) setError(true);
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [file]);

  return (
    <div className={styles.thumbnail}>
      {error ? (
        <p className={styles.fallback}>미리보기를 표시할 수 없습니다.</p>
      ) : (
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          aria-label="PDF 첫 페이지 미리보기"
        />
      )}
    </div>
  );
}
