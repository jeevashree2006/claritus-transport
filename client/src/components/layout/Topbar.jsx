/**
 * Top bar: menu button (mobile), search (visual only for now), notifications,
 * user info and sign-out.
 */
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, Search } from 'lucide-react';
import { Avatar, Button } from '../ui-kit';
import { ROLE_LABELS } from '../../config/roles';
import { useAuth } from '../../context/AuthContext';
import './Topbar.css';

export default function Topbar({ onMenuClick, menuOpen }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="topbar">
      <Button
        variant="ghost"
        icon={Menu}
        onClick={onMenuClick}
        aria-label="Open menu"
        aria-controls="app-sidebar"
        aria-expanded={menuOpen}
        className="topbar__menu"
      />

      {/* Visual only - search will be wired up when the modules exist. */}
      <div className="topbar__search" role="search">
        <Search size={16} aria-hidden="true" className="topbar__search-icon" />
        <input
          type="search"
          className="topbar__search-input"
          placeholder="Search requirements, trips, transporters"
          aria-label="Search"
        />
      </div>

      <div className="topbar__spacer" />

      <div className="topbar__actions">
        <Button variant="ghost" icon={Bell} aria-label="Notifications" className="topbar__bell" />

        <div className="topbar__user">
          <Avatar name={user?.name} />
          <div className="topbar__user-text">
            <span className="topbar__user-name">{user?.name}</span>
            <span className="topbar__user-role">{ROLE_LABELS[user?.role] || user?.role}</span>
          </div>
        </div>

        <Button variant="ghost" icon={LogOut} onClick={handleSignOut} aria-label="Sign out" title="Sign out" />
      </div>
    </header>
  );
}
