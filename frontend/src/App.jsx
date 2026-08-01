import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import Templates from './pages/Templates';
import Campaigns from './pages/Campaigns';
import Logs from './pages/Logs';
import WatiSettings from './pages/WatiSettings';
import WhatsAppInbox from './pages/WhatsAppInbox';
import Analytics from './pages/Analytics';

// Email Pages
import EmailDashboard from './pages/email/EmailDashboard';
import EmailCreateCampaign from './pages/email/EmailCreateCampaign';
import EmailTemplates from './pages/email/EmailTemplates';
import EmailHistory from './pages/email/EmailHistory';
import EmailReports from './pages/email/EmailReports';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/contacts" element={<Contacts />} />
          
          {/* Email Campaign Routes */}
          <Route path="/email/dashboard" element={<EmailDashboard />} />
          <Route path="/email/campaigns" element={<EmailCreateCampaign />} />
          <Route path="/email/templates" element={<EmailTemplates />} />
          <Route path="/email/history" element={<EmailHistory />} />
          <Route path="/email/reports" element={<EmailReports />} />

          <Route path="/templates" element={<Templates />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/create" element={<Campaigns />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/wati/settings" element={<WatiSettings />} />
          <Route path="/whatsapp-inbox" element={<WhatsAppInbox />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
