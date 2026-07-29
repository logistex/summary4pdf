"use client";

import { useState } from "react";
import UploadDropzone from "@/components/UploadDropzone";
import PdfThumbnail from "@/components/PdfThumbnail";
import ExtractedText from "@/components/ExtractedText";
import SummaryResult from "@/components/SummaryResult";
import {
  MAX_FILE_SIZE_BYTES,
  NOT_PDF_MESSAGE,
  SIZE_LIMIT_MESSAGE,
  SUMMARY_FAILED_MESSAGE,
  RESUMMARIZE_FAILED_MESSAGE,
  TIMEOUT_MESSAGE,
  NETWORK_ERROR_MESSAGE,
} from "@/lib/constants";
import styles from "./page.module.css";

type Status = "idle" | "processing" | "result" | "error";

interface SummaryData {
  summary: string;
  points: string[];
}

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [results, setResults] = useState<SummaryData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resummarizing, setResummarizing] = useState(false);
  const [resummarizeError, setResummarizeError] = useState<string | null>(null);

  async function handleFile(selectedFile: File) {
    if (selectedFile.type !== "application/pdf") {
      setStatus("error");
      setError(NOT_PDF_MESSAGE);
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setStatus("error");
      setError(SIZE_LIMIT_MESSAGE);
      return;
    }

    setFile(selectedFile);
    setText(null);
    setResults([]);
    setResummarizeError(null);
    setStatus("processing");
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/summarize", { method: "POST", body: formData });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setStatus("error");
        setError(
          json?.error ?? (res.status === 504 ? TIMEOUT_MESSAGE : SUMMARY_FAILED_MESSAGE)
        );
        return;
      }
      const json = await res.json();
      setText(json.text);
      setResults([{ summary: json.summary, points: json.points }]);
      setStatus("result");
    } catch {
      setStatus("error");
      setError(NETWORK_ERROR_MESSAGE);
    }
  }

  async function handleResummarize() {
    if (results.length === 0) return;
    const latest = results[results.length - 1];
    setResummarizing(true);
    setResummarizeError(null);

    try {
      const res = await fetch("/api/resummarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: latest.summary, points: latest.points }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setResummarizeError(json?.error ?? RESUMMARIZE_FAILED_MESSAGE);
        return;
      }
      setResults((prev) => [...prev, { summary: json.summary, points: json.points }]);
    } catch {
      setResummarizeError(NETWORK_ERROR_MESSAGE);
    } finally {
      setResummarizing(false);
    }
  }

  function reset() {
    setStatus("idle");
    setFile(null);
    setText(null);
    setResults([]);
    setError(null);
    setResummarizeError(null);
  }

  function retry() {
    if (file) handleFile(file);
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>PDF 요약</h1>

      {status === "idle" && <UploadDropzone onFileSelected={handleFile} />}

      {file && status !== "idle" && <PdfThumbnail file={file} />}

      {status === "processing" && <p className={styles.loading}>요약 생성 중...</p>}

      {text && <ExtractedText text={text} />}

      {status === "result" && results.length > 0 && (
        <SummaryResult
          results={results}
          onReset={reset}
          onResummarize={handleResummarize}
          resummarizing={resummarizing}
          resummarizeError={resummarizeError}
        />
      )}

      {status === "error" && (
        <div className={styles.errorBox}>
          <p>{error}</p>
          <div className={styles.errorActions}>
            <button onClick={retry}>다시 시도</button>
            <button onClick={reset}>다른 파일 선택</button>
          </div>
        </div>
      )}
    </main>
  );
}
