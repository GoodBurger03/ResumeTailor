import { useEffect, useRef } from 'react';
import styles from './ScoreRing.module.css';

const CIRCUMFERENCE = 239; // 2π × r=38

/**
 * Animated SVG score ring.
 * @param {{ score: number, title: string, summary: string }} props
 */
export default function ScoreRing({ score, title, summary }) {
  const arcRef = useRef(null);

  useEffect(() => {
    if (!arcRef.current) return;
    const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;
    arcRef.current.style.strokeDashoffset = offset;
  }, [score]);

  return (
    <div className={styles.scoreCard}>
      <div className={styles.ring}>
        <svg width="90" height="90" viewBox="0 0 90 90">
          <circle className={styles.bg} cx="45" cy="45" r="38" />
          <circle
            ref={arcRef}
            className={styles.fg}
            cx="45" cy="45" r="38"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE}
          />
        </svg>
        <div className={styles.scoreNum}>
          <span>{score}</span>
          <small>/ 100</small>
        </div>
      </div>

      <div className={styles.details}>
        <h3>{title}</h3>
        <p>{summary}</p>
      </div>
    </div>
  );
}
