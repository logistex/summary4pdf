"use client";

import { useState } from "react";
import UploadDropzone from "@/components/UploadDropzone";
import PdfThumbnail from "@/components/PdfThumbnail";
import ExtractedText from "@/components/ExtractedText";
import SummaryResult from "@/components/SummaryResult";
import { readSSEStream } from "@/lib/sse";
import {
  MAX_FILE_SIZE_BYTES,
  NOT_PDF_MESSAGE,
  SIZE_LIMIT_MESSAGE,
  EXTRACT_FAILED_MESSAGE,
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
  model: string;
  failedModels: string[];
}

type SummarizeStreamEvent =
  | { type: "trying"; model: string }
  | { type: "failed"; model: string; reason?: string }
  | { type: "done"; summary: string; points: string[]; model: string }
  | { type: "error"; message: string };

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [results, setResults] = useState<SummaryData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resummarizing, setResummarizing] = useState(false);
  const [resummarizeError, setResummarizeError] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [failedModels, setFailedModels] = useState<string[]>([]);

  async function consumeSummaryStream(
    res: Response,
  ): Promise<{ result: SummaryData | null; error: string | null }> {
    let result: SummaryData | null = null;
    let streamError: string | null = null;
    const attemptedFailures: string[] = [];

    await readSSEStream(res, (raw) => {
      const event = raw as SummarizeStreamEvent;
      if (event.type === "trying") {
        setCurrentModel(event.model);
      } else if (event.type === "failed") {
        attemptedFailures.push(event.model);
        setFailedModels((prev) => [...prev, event.model]);
      } else if (event.type === "done") {
        result = {
          summary: event.summary,
          points: event.points,
          model: event.model,
          failedModels: [...attemptedFailures],
        };
      } else if (event.type === "error") {
        streamError = event.message;
      }
    });

    return { result, error: streamError };
  }

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
    setCurrentModel(null);
    setFailedModels([]);
    setStatus("processing");
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    let extractedText: string;
    try {
      const res = await fetch("/api/extract", { method: "POST", body: formData });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setStatus("error");
        setError(
          json?.error ?? (res.status === 504 ? TIMEOUT_MESSAGE : EXTRACT_FAILED_MESSAGE)
        );
        return;
      }
      const json = await res.json();
      extractedText = json.text;
      setText(extractedText);
    } catch {
      setStatus("error");
      setError(NETWORK_ERROR_MESSAGE);
      return;
    }

    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: extractedText }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setStatus("error");
        setError(
          json?.error ?? (res.status === 504 ? TIMEOUT_MESSAGE : SUMMARY_FAILED_MESSAGE)
        );
        return;
      }

      const { result, error: streamError } = await consumeSummaryStream(res);
      setCurrentModel(null);

      if (result) {
        setResults([result]);
        setStatus("result");
      } else {
        setStatus("error");
        setError(streamError ?? SUMMARY_FAILED_MESSAGE);
      }
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
    setCurrentModel(null);
    setFailedModels([]);

    try {
      const res = await fetch("/api/resummarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: latest.summary, points: latest.points }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setResummarizeError(json?.error ?? RESUMMARIZE_FAILED_MESSAGE);
        return;
      }

      const { result, error: streamError } = await consumeSummaryStream(res);
      if (result) {
        setResults((prev) => [...prev, result]);
      } else {
        setResummarizeError(streamError ?? RESUMMARIZE_FAILED_MESSAGE);
      }
    } catch {
      setResummarizeError(NETWORK_ERROR_MESSAGE);
    } finally {
      setCurrentModel(null);
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
    setCurrentModel(null);
    setFailedModels([]);
  }

  function retry() {
    if (file) handleFile(file);
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>PDF 요약</h1>

      {status === "idle" && <UploadDropzone onFileSelected={handleFile} />}

      {file && status !== "idle" && <PdfThumbnail file={file} />}

      {status === "processing" && !text && (
        <p className={styles.loading}>텍스트 추출 중...</p>
      )}

      {text && <ExtractedText text={text} />}

      {status === "processing" && text && (
        <div className={styles.loading}>
          <p>요약 생성 중{currentModel ? ` — ${currentModel} 시도 중` : "..."}</p>
          {failedModels.length > 0 && (
            <p className={styles.modelFailures}>
              실패한 모델: {failedModels.join(", ")}
            </p>
          )}
        </div>
      )}

      {status === "result" && results.length > 0 && (
        <SummaryResult
          results={results}
          onReset={reset}
          onResummarize={handleResummarize}
          resummarizing={resummarizing}
          resummarizeError={resummarizeError}
          currentModel={currentModel}
          failedModels={failedModels}
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
