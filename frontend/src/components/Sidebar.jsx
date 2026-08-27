import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { to: '/', label: 'Dashboard', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
  { to: '/contacts', label: 'Contacts', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg> },
  { to: '/templates', label: 'Templates', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg> },
  { to: '/campaigns', label: 'Campaigns', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M22 2L11 13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg> },
];

const Sidebar = ({ open, onClose, collapsed, onToggleCollapse }) => {
  const content = (
    <motion.aside 
      initial={false}
      animate={{ width: collapsed ? 80 : 260 }}
      className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/10 bg-primary text-white shadow-2xl transition-all duration-300 lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
    >
      <div className={`flex items-center justify-between border-b border-white/10 ${collapsed ? 'px-4 py-4' : 'px-5 py-5'}`}>
        <div className={`flex items-center gap-3 min-w-0 ${collapsed ? 'justify-center' : ''}`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-[#FF8F3D] shadow-lg shadow-accent/20 flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div 
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="min-w-0 overflow-hidden"
              >
                <h1 className="truncate text-base font-bold tracking-tight">Omni CRM</h1>
                <p className="text-[11px] text-primary-300 font-medium tracking-wide">ENTERPRISE EDITION</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6 custom-scrollbar">
        {navItems.map((item, i) => (
          <div key={item.to}>
            {item.divider && <div className="my-4 border-t border-white/5 mx-2" />}
            <NavLink to={item.to} end={item.to === '/'} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive ? 'bg-primary-hover text-white shadow-md' : 'text-primary-300 hover:bg-white/5 hover:text-white'}`}>
              <span className={`flex-shrink-0 transition-colors ${item.to === window.location.pathname ? 'text-accent' : ''}`}>{item.icon}</span>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="truncate whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          </div>
        ))}
      </nav>

      <div className={`border-t border-white/10 px-4 py-5 ${collapsed ? 'text-center' : ''}`}>
        <button onClick={onToggleCollapse} className="w-full flex items-center justify-center gap-2 p-2 rounded-xl border border-white/10 hover:bg-white/5 text-primary-300 hover:text-white transition-colors hidden lg:flex">
           {collapsed ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg> : <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M11 19l-7-7 7-7M19 19l-7-7 7-7"/></svg> <span className="text-sm font-medium">Collapse</span></>}
        </button>
      </div>
    </motion.aside>
  );

  return (
    <>
      {open && <button type="button" className="fixed inset-0 z-30 bg-primary/40 backdrop-blur-sm lg:hidden" onClick={onClose} aria-label="Close navigation" />}
      {content}
    </>
  );
};

export default Sidebar;
