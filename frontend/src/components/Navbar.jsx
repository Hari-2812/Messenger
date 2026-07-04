import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
);

const Navbar = ({ title }) => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="flex items-center justify-between px-6 h-16">
        {/* Page Title */}
        <div>
          <h2 className="text-base font-bold text-gray-900 leading-none">{title}</h2>
          <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <button className="btn-icon relative" title="Notifications" id="notif-bell-btn">
            <BellIcon />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full border-2 border-white" />
          </button>

          {/* Divider */}
          <div className="w-px h-7 bg-gray-200 mx-1" />

          {/* User Menu */}
          <div className="relative">
            <button
              id="user-menu-btn"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-3 pl-1 pr-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors duration-150"
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
              >
                {initials}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-semibold text-gray-900 leading-none">{user?.name}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[120px]">{user?.role || 'admin'}</p>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-gray-400">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                  <div className="px-3 py-2 border-b border-gray-50">
                    <p className="text-xs font-semibold text-gray-900 truncate">{user?.email}</p>
                  </div>
                  <button
                    id="logout-btn"
                    onClick={() => { setMenuOpen(false); logout(); }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                    </svg>
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
