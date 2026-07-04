import { NavLink } from 'react-router-dom';

const navItems = [
  {
    to: '/',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    to: '/contacts',
    label: 'Contacts',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  {
    to: '/templates',
    label: 'Templates',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    to: '/campaigns',
    label: 'Campaigns',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
        <path d="M22 2L11 13"/>
        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
    ),
  },
  {
    to: '/whatsapp-inbox',
    label: 'Inbox',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
  },
  {
    to: '/analytics',
    label: 'Analytics',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
  {
    to: '/logs',
    label: 'Message Logs',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
        <path d="M9 12h6M9 16h6M9 8h6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"/>
      </svg>
    ),
  },
  {
    to: '/wati/settings',
    label: 'WATI Settings',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
      </svg>
    ),
    divider: true,
  },
];

const Sidebar = () => {
  return (
    <aside
      className="flex flex-col"
      style={{
        width: 'var(--sidebar-width, 260px)',
        background: 'linear-gradient(175deg, #1e1b4b 0%, #312e81 60%, #1e1b4b 100%)',
        minHeight: '100vh',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div className="px-6 pt-6 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)' }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M11.5 2C6.262 2 2 6.262 2 11.5c0 1.836.528 3.55 1.442 5L2 22l5.664-1.41A9.427 9.427 0 0011.5 21c5.238 0 9.5-4.262 9.5-9.5S16.738 2 11.5 2z" fillRule="evenodd" clipRule="evenodd" opacity="0.8"/>
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-white text-sm leading-tight">WhatsApp CRM</h1>
            <p className="text-xs text-indigo-300 mt-0.5">WATI Console</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <div key={item.to}>
            {item.divider && (
              <div className="border-t border-white/10 my-2.5 mx-2" />
            )}
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <span
                className="sidebar-icon"
                style={undefined}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 pb-5 pt-3 border-t border-white/10">
        <div className="flex items-center gap-2 px-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: '#25d366', boxShadow: '0 0 6px #25d366' }}
          />
          <p className="text-xs text-indigo-300 font-medium">Live · WATI Connected</p>
        </div>
        <p className="text-[10px] text-indigo-400/60 mt-1 px-2">v2.0 · WhatsApp CRM Platform</p>
      </div>
    </aside>
  );
};

export default Sidebar;
