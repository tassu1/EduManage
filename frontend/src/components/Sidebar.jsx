import { useState } from "react";
import { ChevronLeft, ChevronRight, LogOut, GraduationCap } from "lucide-react";
import "./Sidebar.css";

/**
 * Shared app sidebar, reused across every role.
 *
 * @param {{id: string, label: string, icon: React.ComponentType}[]} items
 * @param {string} activeId - id of the currently active item
 * @param {(id: string) => void} onSelect
 * @param {string} roleLabel - shown under the app name, e.g. "Super Admin"
 * @param {() => void} onLogout
 */
export default function Sidebar({ items, activeId, onSelect, roleLabel, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`em-sidebar ${collapsed ? "is-collapsed" : ""}`}>
      <div className="em-sidebar__header">
        <div className="em-sidebar__brand">
          <GraduationCap size={22} strokeWidth={2} />
          {!collapsed && <span>EduManage</span>}
        </div>
        <button
          type="button"
          className="em-sidebar__collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {!collapsed && roleLabel && <div className="em-sidebar__role">{roleLabel}</div>}

      <nav className="em-sidebar__nav">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`em-sidebar__item ${activeId === item.id ? "is-active" : ""}`}
              onClick={() => onSelect(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} strokeWidth={2} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <button type="button" className="em-sidebar__logout" onClick={onLogout} title="Log out">
        <LogOut size={18} strokeWidth={2} />
        {!collapsed && <span>Log out</span>}
      </button>
    </aside>
  );
}
