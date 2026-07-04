import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const pageTitles = {
  '/':                  'Dashboard',
  '/contacts':          'Contacts',
  '/templates':         'Templates',
  '/campaigns':         'Campaigns',
  '/campaigns/create':  'Create Campaign',
  '/logs':              'Message Logs',
  '/wati/settings':     'WATI Settings',
  '/whatsapp-inbox':    'WhatsApp Inbox',
  '/analytics':         'Analytics',
};

/** Pages that need edge-to-edge layout (no padding) */
const EDGE_PAGES = ['/whatsapp-inbox'];

const Layout = () => {
  const location = useLocation();
  const title    = pageTitles[location.pathname] || 'Dashboard';
  const isEdge   = EDGE_PAGES.includes(location.pathname);

  return (
    <div className="flex min-h-screen" style={{ background: '#f8f7ff' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar title={title} />
        <main
          className={`flex-1 overflow-auto ${isEdge ? '' : 'p-8'}`}
          style={{ minHeight: 0 }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
