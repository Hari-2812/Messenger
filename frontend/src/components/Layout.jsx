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

const Layout = () => {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Dashboard';

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar title={title} />
        <main className="flex-1 p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
