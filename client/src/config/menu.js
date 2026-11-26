/**
 * THE single list of app modules.
 * Both the sidebar and the routes are built from this array, so adding a module
 * means adding ONE entry here (plus its page component).
 *
 * Fields:
 *   key         unique id
 *   label       sidebar text (sentence case)
 *   path        URL
 *   icon        lucide-react icon component
 *   roles       which roles can see and open it
 *   component   page component rendered at `path`
 */
import { Bot, ChartColumnBig, ClipboardList, History, LayoutDashboard, Settings, Truck } from 'lucide-react';
import { ROLES } from './roles';

import DashboardPage from '../modules/dashboard/DashboardPage';
import TransportersPage from '../modules/transporters/TransportersPage';
import RequirementsPage from '../modules/requirements/RequirementsPage';
import AgentWorkflowPage from '../modules/agent-workflow/AgentWorkflowPage';
import SuccessRatePage from '../modules/success-rate/SuccessRatePage';
import AuditLogsPage from '../modules/audit-logs/AuditLogsPage';
import SettingsPage from '../modules/settings/SettingsPage';

const { ADMIN, MD } = ROLES;

export const MENU = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: [ADMIN], component: DashboardPage },
  { key: 'transporters', label: 'Transporters', path: '/transporters', icon: Truck, roles: [ADMIN], component: TransportersPage },
  { key: 'requirements', label: 'Requirements', path: '/requirements', icon: ClipboardList, roles: [ADMIN], component: RequirementsPage },
  { key: 'agent-workflow', label: 'Agent workflow', path: '/agent-workflow', icon: Bot, roles: [ADMIN, MD], component: AgentWorkflowPage },
  { key: 'success-rate', label: 'Success rate', path: '/success-rate', icon: ChartColumnBig, roles: [ADMIN, MD], component: SuccessRatePage },
  { key: 'audit-logs', label: 'Audit logs', path: '/audit-logs', icon: History, roles: [ADMIN], component: AuditLogsPage },
  { key: 'settings', label: 'Settings', path: '/settings', icon: Settings, roles: [ADMIN], component: SettingsPage },
];

/** Menu items the given role is allowed to see. */
export function getMenuForRole(role) {
  return MENU.filter((item) => item.roles.includes(role));
}
