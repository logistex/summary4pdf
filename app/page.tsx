"use client";

import { useState } from "react";
import UploadDropzone from "@/components/UploadDropzone";
import SummaryResult from "@/components/SummaryResult";
import {
  MAX_FILE_SIZE_BYTES,
  NOT_PDF_MESSAGE,
  SIZE_LIMIT_MESSAGE,
  SUMMARY_FAILED_MESSAGE,
} from "@/lib/constants";
import styles from "./page.module.css";

type Status = "idle" | "processing" | "result" | "error";

interface SummaryData {
  summary: string;
  points: string[];
}

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<SummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (file.type !== "application/pdf") {
      setStatus("error");
      setError(NOT_PDF_MESSAGE);
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setStatus("error");
      setError(SIZE_LIMIT_MESSAGE);
      return;
    }

    setStatus("processing");
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/summarize", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        setStatus("error");
        setError(json.error ?? SUMMARY_FAILED_MESSAGE);
        return;
      }
      setData(json);
      setStatus("result");
    } catch {
      setStatus("error");
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요");
    }
  }

  function reset() {
    setStatus("idle");
    setData(null);
    setError(null);
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>PDF 요약</h1>

      {status === "idle" && <UploadDropzone onFileSelected={handleFile} />}

      {status === "processing" && <p className={styles.loading}>요약 생성 중...</p>}

      {status === "result" && data && (
        <SummaryResult summary={data.summary} points={data.points} onReset={reset} />
      )}

      {status === "error" && (
        <div className={styles.errorBox}>
          <p>{error}</p>
          <button onClick={reset}>다시 시도</button>
        </div>
      )}
    </main>
  );
}
