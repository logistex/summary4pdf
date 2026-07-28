import styles from "./SummaryResult.module.css";

interface Props {
  summary: string;
  points: string[];
  onReset: () => void;
}

export default function SummaryResult({ summary, points, onReset }: Props) {
  return (
    <section className={styles.result} aria-label="요약 결과">
      <p className={styles.summary}>{summary}</p>
      <ul className={styles.points}>
        {points.map((point, i) => (
          <li key={i}>{point}</li>
        ))}
      </ul>
      <button className={styles.resetButton} onClick={onReset}>
        다른 PDF 요약하기
      </button>
    </section>
  );
}
