import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/contacts', label: 'Contacts', icon: '👥' },
  { to: '/templates', label: 'Templates', icon: '📝' },
  { to: '/campaigns', label: 'Campaigns', icon: '📢' },
  { to: '/logs', label: 'Message Logs', icon: '📋' },
];

const Sidebar = () => {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white text-xl">
            💬
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-sm leading-tight">WhatsApp</h1>
            <p className="text-xs text-gray-500">Campaign Manager</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-400 text-center">Mock Provider v1.0</p>
      </div>
    </aside>
  );
};

export default Sidebar;
