import styles from "./SummaryResult.module.css";

interface SummaryData {
  summary: string;
  points: string[];
  model: string;
  failedModels: string[];
}

interface Props {
  results: SummaryData[];
  onReset: () => void;
  onResummarize: () => void;
  resummarizing: boolean;
  resummarizeError: string | null;
  currentModel: string | null;
  failedModels: string[];
}

export default function SummaryResult({
  results,
  onReset,
  onResummarize,
  resummarizing,
  resummarizeError,
  currentModel,
  failedModels,
}: Props) {
  return (
    <section className={styles.result} aria-label="요약 결과">
      {results.map((result, i) => (
        <div key={i} className={styles.entry}>
          {i > 0 && <p className={styles.entryLabel}>반복 요약 {i}</p>}
          <p className={styles.summary}>{result.summary}</p>
          <ul className={styles.points}>
            {result.points.map((point, j) => (
              <li key={j}>{point}</li>
            ))}
          </ul>
          <p className={styles.modelInfo}>
            사용된 모델: {result.model}
            {result.failedModels.length > 0 &&
              ` (실패: ${result.failedModels.join(", ")})`}
          </p>
        </div>
      ))}
      {resummarizing && (
        <p className={styles.modelStatus}>
          {currentModel ? `${currentModel} 시도 중...` : "요약 생성 중..."}
          {failedModels.length > 0 && ` (실패: ${failedModels.join(", ")})`}
        </p>
      )}
      {resummarizeError && (
        <p className={styles.resummarizeError}>{resummarizeError}</p>
      )}
      <div className={styles.actions}>
        <button className={styles.resetButton} onClick={onReset}>
          다른 PDF 요약하기
        </button>
        <button
          className={styles.resetButton}
          onClick={onResummarize}
          disabled={resummarizing}
        >
          {resummarizing ? "재요약 중..." : "반복 요약하기"}
        </button>
      </div>
    </section>
  );
}
