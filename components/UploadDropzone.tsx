"use client";

import { useRef, useState, type DragEvent } from "react";
import { SIZE_LIMIT_HINT } from "@/lib/constants";
import styles from "./UploadDropzone.module.css";

interface Props {
  onFileSelected: (file: File) => void;
}

export default function UploadDropzone({ onFileSelected }: Props) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelected(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
    e.target.value = "";
  }

  return (
    <div
      className={`${styles.dropzone} ${isDragOver ? styles.dragOver : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="PDF 파일 업로드"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <p>PDF 파일을 여기에 끌어다 놓거나 클릭해서 선택하세요.</p>
      <p className={styles.hint}>{SIZE_LIMIT_HINT}</p>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className={styles.hiddenInput}
        onChange={handleInputChange}
      />
    </div>
  );
}
