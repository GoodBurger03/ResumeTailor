import styles from './Tabs.module.css';

/**
 * @param {{ tabs: {id:string, label:string}[], active: string, onChange: (id:string)=>void }} props
 */
export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className={styles.tabs} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          className={`${styles.tab} ${active === t.id ? styles.active : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
