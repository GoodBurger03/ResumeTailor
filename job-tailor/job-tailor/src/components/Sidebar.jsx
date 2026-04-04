import styles from './Sidebar.module.css';

const NAV_GROUPS = [
  {
    label: 'Job Search',
    items: [
      { id: 'jobs',    icon: '⊞', label: 'Job Board'      },
      { id: 'salary',  icon: '💰', label: 'Salary Insights' },
    ],
  },
  {
    label: 'Applications',
    items: [
      { id: 'tailor',    icon: '✦', label: 'Resume Tailor'  },
      { id: 'cover',     icon: '✉', label: 'Cover Letter'   },
      { id: 'interview', icon: '🎯', label: 'Interview Prep' },
      { id: 'email',     icon: '📨', label: 'Email Drafter'  },
    ],
  },
  {
    label: 'Manage',
    items: [
      { id: 'resumes',  icon: '📁', label: 'My Resumes'  },
      { id: 'tracker',  icon: '◎', label: 'Tracker'      },
      { id: 'dash',     icon: '▲', label: 'Dashboard'    },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'settings', icon: '⚙', label: 'Settings' },
    ],
  },
];

export default function Sidebar({ active, onChange }) {
  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoMark}>J</div>
        <div className={styles.logoText}>Job<span>Tailor</span></div>
      </div>

      <nav className={styles.nav}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className={styles.group}>
            <div className={styles.groupLabel}>{group.label}</div>
            {group.items.map((item) => (
              <button
                key={item.id}
                className={`${styles.navItem} ${active === item.id ? styles.active : ''}`}
                onClick={() => onChange(item.id)}
              >
                <span className={styles.icon}>{item.icon}</span>
                <span className={styles.label}>{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
