/**
 * Left navigation, built from config/menu.js for the signed-in user's role.
 *  - desktop (>= 1024px): full width with labels
 *  - tablet (768-1023px): icons only, label shown as a tooltip (title)
 *  - mobile (<= 767px): hidden; slides in as a drawer when `open`
 */
import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button, Logo } from '../ui-kit';
import { getMenuForRole } from '../../config/menu';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const items = getMenuForRole(user?.role);

  return (
    <aside
      id="app-sidebar"
      className={['sidebar', open && 'sidebar--open'].filter(Boolean).join(' ')}
      aria-label="Main navigation"
    >
      <div className="sidebar__brand">
        <Logo variant="full" className="sidebar__logo sidebar__logo--full" />
        <Logo variant="mark" className="sidebar__logo sidebar__logo--mark" />
        <Button
          variant="ghost"
          size="sm"
          icon={X}
          onClick={onClose}
          aria-label="Close menu"
          className="sidebar__close"
        />
      </div>

      <nav className="sidebar__nav">
        <ul className="sidebar__list">
          {items.map(({ key, label, path, icon: Icon }) => (
            <li key={key}>
              <NavLink
                to={path}
                title={label}
                onClick={onClose}
                className={({ isActive }) => ['sidebar__link', isActive && 'sidebar__link--active'].filter(Boolean).join(' ')}
              >
                <Icon size={20} aria-hidden="true" className="sidebar__icon" />
                <span className="sidebar__label">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <p className="sidebar__tagline">AI agents for every trip, people for every decision.</p>
    </aside>
  );
}
