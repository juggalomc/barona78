export const styles = {
  app: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f8fafc',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    color: '#0f172a'
  },
  sidebar: {
    width: '260px',
    background: '#0f172a',
    color: '#e2e8f0',
    padding: '24px 16px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    position: 'fixed',
    height: '100vh',
    left: 0,
    top: 0,
    overflowY: 'auto',
    zIndex: 40,
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #1e293b'
  },
  logo: {
    fontSize: '18px',
    fontWeight: '700',
    letterSpacing: '-0.02em',
    marginBottom: '24px',
    textAlign: 'left',
    padding: '0 8px 16px 8px',
    borderBottom: '1px solid #1e293b',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1
  },
  navBtn: {
    background: 'transparent',
    color: '#94a3b8',
    border: 'none',
    padding: '10px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13.5px',
    fontWeight: '500',
    transition: 'all 0.15s ease-in-out',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%'
  },
  navBtnActive: {
    background: '#1e293b',
    color: '#60a5fa',
    fontWeight: '600',
    boxShadow: 'inset 3px 0 0 #3b82f6'
  },
  main: {
    marginLeft: '260px',
    flex: 1,
    padding: '32px 40px',
    maxWidth: '1600px',
    minHeight: '100vh'
  },
  header: {
    marginBottom: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    paddingBottom: '20px',
    borderBottom: '1px solid #e2e8f0'
  },
  h1: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 4px 0',
    letterSpacing: '-0.025em'
  },
  subtitle: {
    fontSize: '13.5px',
    color: '#64748b',
    margin: 0
  },
  content: {},
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: '16px',
    marginBottom: '28px'
  },
  stat: {
    background: '#ffffff',
    color: '#0f172a',
    padding: '20px 24px',
    borderRadius: '12px',
    textAlign: 'left',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.04)',
    position: 'relative'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '4px',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.03em',
    color: '#0f172a'
  },
  statLabel: {
    fontSize: '12.5px',
    fontWeight: '500',
    color: '#64748b'
  },
  card: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.04)',
    border: '1px solid #e2e8f0'
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '18px',
    color: '#0f172a',
    letterSpacing: '-0.01em',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '20px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '14px'
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '13.5px',
    fontFamily: 'inherit',
    color: '#0f172a',
    background: '#ffffff',
    transition: 'border-color 0.15s, box-shadow 0.15s'
  },
  btn: {
    padding: '10px 18px',
    background: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13.5px',
    transition: 'background 0.15s, transform 0.05s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  btnSmall: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    padding: '6px 10px',
    borderRadius: '6px'
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '13.5px'
  },
  invoiceCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    marginBottom: '8px',
    gap: '12px'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px'
  },
  summaryItem: {
    padding: '18px',
    background: '#ffffff',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 2px 0 rgba(15, 23, 42, 0.03)'
  },
  summaryLabel: {
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '6px',
    fontWeight: '500'
  },
  loading: {
    textAlign: 'center',
    padding: '48px',
    fontSize: '14px',
    color: '#64748b'
  }
};
