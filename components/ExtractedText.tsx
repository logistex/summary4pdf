import styles from "./ExtractedText.module.css";

interface Props {
  text: string;
}

export default function ExtractedText({ text }: Props) {
  return (
    <section className={styles.box} aria-label="추출된 텍스트">
      <h2 className={styles.heading}>추출된 텍스트</h2>
      <pre className={styles.text}>{text}</pre>
    </section>
  );
}
