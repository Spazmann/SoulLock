import { Link, Outlet } from 'react-router-dom';
import styles from './Layout.module.css';

const Layout = () => (
  <div className={styles.appShell}>
    <header className={styles.header}>
      <Link to="/" className={styles.brand}>
        <span className={styles.brandAccent}>SoulLock</span>
        <span className={styles.brandLabel}>Coordinator</span>
      </Link>
      <nav className={styles.nav}>
        <Link to="/">Home</Link>
      </nav>
    </header>
    <main className={styles.main}>
      <Outlet />
    </main>
  </div>
);

export default Layout;
