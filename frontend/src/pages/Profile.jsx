import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { User as UserIcon, Building2, Phone, Mail, Camera, Save, Lock, Send, Key } from 'lucide-react';
import axios from 'axios';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [brevoStatus, setBrevoStatus] = useState({ connected: false, loading: true });
  const [brevoForm, setBrevoForm] = useState({ apiKey: '', senderName: '', senderEmail: '' });
  const [connectingBrevo, setConnectingBrevo] = useState(false);

  
  const fetchBrevoStatus = async () => {
    try {
      const { data } = await axios.get('/api/brevo/status', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBrevoStatus({ ...data, loading: false });
    } catch (err) {
      setBrevoStatus({ connected: false, loading: false });
    }
  };

  useEffect(() => {
    fetchBrevoStatus();
  }, []);
  
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      companyName: user?.companyName || '',
      phone: user?.phone || '',
      email: user?.email || '',
    }
  });

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      await updateProfile(data);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    toast.error('Password change not implemented in this demo.');
  };

  const handleConnectBrevo = async (e) => {
    e.preventDefault();
    if (!brevoForm.apiKey || !brevoForm.senderName || !brevoForm.senderEmail) {
      return toast.error('All Brevo fields are required');
    }
    setConnectingBrevo(true);
    try {
      await axios.post('/api/brevo/connect', brevoForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Brevo connected successfully!');
      fetchBrevoStatus();
      setBrevoForm({ apiKey: '', senderName: '', senderEmail: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to connect Brevo');
    } finally {
      setConnectingBrevo(false);
    }
  };

  const handleDisconnectBrevo = async () => {
    try {
      await axios.delete('/api/brevo/disconnect', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Brevo disconnected');
      fetchBrevoStatus();
    } catch (err) {
      toast.error('Failed to disconnect');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-md">
            {user?.avatar ? (
              <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-indigo-500">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </span>
            )}
          </div>
          <button className="absolute bottom-0 right-0 bg-white p-1.5 rounded-full shadow-md text-gray-500 hover:text-primary transition-colors">
            <Camera size={16} />
          </button>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{user?.firstName} {user?.lastName}</h1>
          <p className="text-gray-500 mt-1">{user?.role?.toUpperCase()} Account</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <UserIcon size={18} className="text-indigo-500" />
                Personal Information
              </h2>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    {...register('firstName', { required: 'Required' })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                  {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>}
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    {...register('lastName', { required: 'Required' })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                  {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>}
                </div>
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <div className="relative">
                  <input
                    {...register('companyName', { required: 'Required' })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                </div>
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <input
                    {...register('email')}
                    disabled
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                </div>
                <p className="mt-1 text-xs text-gray-500">Contact support to change your email address.</p>
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <div className="relative">
                  <input
                    {...register('phone')}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary hover:bg-primary-hover text-white font-medium py-2 px-6 rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-70"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                  {!submitting && <Save size={16} />}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Lock size={18} className="text-indigo-500" />
                Security
              </h2>
            </div>
            
            <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="••••••••"
                />
              </div>
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="Create new password"
                />
              </div>
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="Confirm new password"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-md"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>

          {/* Brevo Integration Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Send size={18} className="text-primary" />
                Brevo Email Integration
              </h2>
            </div>
            
            <div className="p-6">
              {brevoStatus.loading ? (
                <div className="flex justify-center p-4">
                  <div className="w-6 h-6 border-2 border-primary border-t-accent rounded-full animate-spin" />
                </div>
              ) : brevoStatus.connected ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <div className="flex items-center gap-2 text-emerald-700 font-semibold mb-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      Connected to Brevo
                    </div>
                    <div className="text-sm text-emerald-800 space-y-1">
                      <p><strong>Sender Name:</strong> {brevoStatus.senderName}</p>
                      <p><strong>Sender Email:</strong> {brevoStatus.senderEmail}</p>
                      <p><strong>Daily Usage:</strong> {brevoStatus.emailsSentToday} / {brevoStatus.dailyLimit}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDisconnectBrevo}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2.5 px-4 rounded-xl transition-all"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <form onSubmit={handleConnectBrevo} className="space-y-4">
                  <p className="text-sm text-text-muted mb-4">Connect your Brevo account to send email campaigns (Limit: 300/day per user).</p>
                  
                  <div className="form-group">
                    <label className="block text-sm font-medium text-gray-700 mb-1">API Key (v3)</label>
                    <div className="relative">
                      <input
                        type="password"
                        value={brevoForm.apiKey}
                        onChange={(e) => setBrevoForm({...brevoForm, apiKey: e.target.value})}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                        placeholder="xkeysib-..."
                      />
                      <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sender Name</label>
                    <input
                      type="text"
                      value={brevoForm.senderName}
                      onChange={(e) => setBrevoForm({...brevoForm, senderName: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div className="form-group">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sender Email</label>
                    <input
                      type="email"
                      value={brevoForm.senderEmail}
                      onChange={(e) => setBrevoForm({...brevoForm, senderEmail: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                      placeholder="e.g. john@yourcompany.com"
                    />
                  </div>
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={connectingBrevo}
                      className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-md disabled:opacity-70 flex justify-center gap-2 items-center"
                    >
                      {connectingBrevo ? 'Connecting...' : 'Connect Brevo'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
