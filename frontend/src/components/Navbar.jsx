import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
  </svg>
);

const Navbar = ({ title, onMenuClick, onToggleCollapse, collapsed }) => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onMenuClick} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border text-text-muted hover:bg-background lg:hidden transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-w-0"
          >
            <h2 className="truncate text-base font-bold text-text">{title}</h2>
            <p className="hidden text-xs text-text-muted sm:block">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </motion.div>
        </div>

        <div className="flex items-center gap-3">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-icon relative" 
            title="Notifications"
          >
            <BellIcon />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border border-white bg-status-danger" />
          </motion.button>

          <div className="hidden h-7 w-px bg-border sm:block" />

          <div className="relative">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setMenuOpen((value) => !value)} 
              className="flex items-center gap-3 rounded-xl px-1.5 py-1.5 pr-3 hover:bg-background transition-colors"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary shadow-md text-xs font-bold text-white">
                {initials}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-bold text-text leading-tight">{user?.name}</p>
                <p className="text-xs text-text-muted">{user?.role || 'Admin'}</p>
              </div>
              <motion.svg 
                animate={{ rotate: menuOpen ? 180 : 0 }}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" 
                className="hidden h-4 w-4 text-text-muted sm:block"
              >
                <polyline points="6 9 12 15 18 9" />
              </motion.svg>
            </motion.button>

            <AnimatePresence>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-border bg-card py-2 shadow-elevated"
                  >
                    <div className="border-b border-border px-4 py-2 mb-2">
                      <p className="truncate text-sm font-bold text-text">{user?.name}</p>
                      <p className="truncate text-xs text-text-muted">{user?.email}</p>
                    </div>
                    <button onClick={() => { setMenuOpen(false); logout(); }} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-medium text-status-danger transition-colors hover:bg-red-50">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                      Sign Out
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
