import styles from "./SummaryResult.module.css";

interface SummaryData {
  summary: string;
  points: string[];
}

interface Props {
  results: SummaryData[];
  onReset: () => void;
  onResummarize: () => void;
  resummarizing: boolean;
  resummarizeError: string | null;
}

export default function SummaryResult({
  results,
  onReset,
  onResummarize,
  resummarizing,
  resummarizeError,
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
        </div>
      ))}
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
