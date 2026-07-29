import styles from "./SummaryResult.module.css";

interface Props {
  summary: string;
  points: string[];
  onReset: () => void;
  onResummarize: () => void;
  resummarizing: boolean;
  resummarizeError: string | null;
}

export default function SummaryResult({
  summary,
  points,
  onReset,
  onResummarize,
  resummarizing,
  resummarizeError,
}: Props) {
  return (
    <section className={styles.result} aria-label="요약 결과">
      <p className={styles.summary}>{summary}</p>
      <ul className={styles.points}>
        {points.map((point, i) => (
          <li key={i}>{point}</li>
        ))}
      </ul>
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
