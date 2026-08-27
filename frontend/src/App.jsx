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

// Email Pages (now the primary CRM features)
import EmailCreateCampaign from './pages/email/EmailCreateCampaign';
import EmailTemplates from './pages/email/EmailTemplates';
import GoogleSheetsIntegration from './pages/email/GoogleSheetsIntegration';

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
          <Route path="/contacts/import" element={<GoogleSheetsIntegration />} />
          <Route path="/templates" element={<EmailTemplates />} />
          <Route path="/campaigns" element={<EmailCreateCampaign />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
