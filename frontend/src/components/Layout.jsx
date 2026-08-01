import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const pageTitles = {
  '/': 'Dashboard',
  '/contacts': 'Contacts',
  '/templates': 'Templates',
  '/campaigns': 'Campaigns',
  '/campaigns/create': 'Create Campaign',
  '/logs': 'Message Logs',
  '/wati/settings': 'WATI Settings',
  '/whatsapp-inbox': 'WhatsApp Inbox',
  '/analytics': 'Analytics',
};

const EDGE_PAGES = ['/whatsapp-inbox'];

const Layout = () => {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Dashboard';
  const isEdge = EDGE_PAGES.includes(location.pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background text-text font-sans">
      <div className="flex min-h-screen">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
        />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Navbar
            title={title}
            onMenuClick={() => setSidebarOpen(true)}
            onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
            collapsed={sidebarCollapsed}
          />
          <main className={`flex-1 overflow-auto ${isEdge ? '' : 'p-4 sm:p-6 lg:p-8'}`} style={{ minHeight: 0 }}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
