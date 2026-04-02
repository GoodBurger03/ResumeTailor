import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <div className={styles.logoMark}>J</div>
        <div className={styles.logoText}>
          Job<span>Tailor</span>
        </div>
      </div>
      <div className={styles.subtitle}>Resume Intelligence Suite</div>
    </header>
  );
}
