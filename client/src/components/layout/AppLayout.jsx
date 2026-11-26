/**
 * Signed-in page frame: Sidebar + Topbar + the current page (<Outlet />).
 * Owns the mobile drawer state.
 */
import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import './AppLayout.css';

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);

  // Close the drawer whenever the page changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // While the drawer is open: Escape closes it and the page behind doesn't scroll.
  useEffect(() => {
    if (!drawerOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeDrawer();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.classList.add('no-scroll');

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('no-scroll');
    };
  }, [drawerOpen, closeDrawer]);

  // If the window grows past mobile size, drop the drawer state.
  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const onChange = (event) => event.matches && closeDrawer();
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [closeDrawer]);

  return (
    <div className="app-layout">
      <Sidebar open={drawerOpen} onClose={closeDrawer} />

      {drawerOpen && <div className="app-layout__overlay" onClick={closeDrawer} aria-hidden="true" />}

      <div className="app-layout__main">
        <Topbar onMenuClick={openDrawer} menuOpen={drawerOpen} />
        <main id="main-content" className="app-layout__content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
