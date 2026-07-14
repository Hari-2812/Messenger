import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, LogIn, ShieldCheck, Zap, Users, BarChart } from 'lucide-react';

const FeaturePill = ({ icon: Icon, title, description }) => (
  <div className="flex items-start gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 transition-all hover:bg-white/15">
    <div className="p-2 bg-white/20 rounded-xl text-white">
      <Icon size={24} />
    </div>
    <div>
      <h3 className="text-white font-semibold mb-1">{title}</h3>
      <p className="text-indigo-200 text-sm">{description}</p>
    </div>
  </div>
);

const Login = () => {
  const { user, login, loading } = useAuth();
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    mode: 'onTouched',
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="spinner w-10 h-10 border-indigo-500 border-t-indigo-200" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Panel — Branding & Features */}
      <div className="hidden lg:flex lg:w-[45%] flex-col relative overflow-hidden bg-indigo-900">
        {/* Animated Background Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/30 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30">
              <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M11.5 2C6.262 2 2 6.262 2 11.5c0 1.836.528 3.55 1.442 5L2 22l5.664-1.41A9.427 9.427 0 0011.5 21c5.238 0 9.5-4.262 9.5-9.5S16.738 2 11.5 2z" opacity="0.8"/>
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-lg tracking-wide">WhatsApp CRM</p>
              <p className="text-indigo-300 text-xs font-medium uppercase tracking-wider">Enterprise Edition</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-md">
            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
              Welcome back to your <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-indigo-300">
                dashboard
              </span>
            </h1>
            <p className="text-indigo-200 text-lg mb-10 leading-relaxed">
              Sign in to manage your campaigns, view real-time analytics, and communicate with your audience.
            </p>

            <div className="space-y-4">
              <FeaturePill 
                icon={Zap} 
                title="Bulk WhatsApp Campaigns" 
                description="Send personalized messages to thousands of contacts instantly." 
              />
              <FeaturePill 
                icon={Users} 
                title="Contact Management" 
                description="Sync and manage your contacts with advanced filtering." 
              />
              <FeaturePill 
                icon={BarChart} 
                title="Real-Time Analytics" 
                description="Track delivery, read rates, and campaign ROI in real-time." 
              />
            </div>
          </div>
          
          <div className="mt-12 flex items-center gap-4 text-indigo-200/80 text-sm">
            <ShieldCheck size={20} />
            <p>End-to-end encrypted · GDPR Compliant · 99.9% Uptime</p>
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 h-screen overflow-y-auto">
        <div className="w-full max-w-xl bg-white/70 backdrop-blur-xl rounded-3xl p-8 sm:p-10 shadow-2xl shadow-indigo-900/5 border border-white animate-fade-in my-8">
          
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-md">
              <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a7.003 7.003 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M11.5 2C6.262 2 2 6.262 2 11.5c0 1.836.528 3.55 1.442 5L2 22l5.664-1.41A9.427 9.427 0 0011.5 21c5.238 0 9.5-4.262 9.5-9.5S16.738 2 11.5 2z" opacity="0.8"/>
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-xl tracking-tight">WhatsApp CRM</span>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h2>
            <p className="text-gray-500">Sign in to your dashboard to manage campaigns.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                {...register('email', { 
                  required: 'Email is required',
                  pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email address' }
                })}
                className={`w-full px-4 py-2.5 rounded-xl border ${errors.email ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'} bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all`}
                placeholder="you@company.com"
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="form-group relative">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <Link to="/forgot-password" className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  {...register('password', { required: 'Password is required' })}
                  className={`w-full px-4 py-2.5 rounded-xl border ${errors.password ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'} bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all pr-10`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <div className="flex items-center mt-2">
              <input
                type="checkbox"
                id="remember"
                {...register('remember')}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
                Remember me for 30 days
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex justify-center items-center gap-2 mt-4"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Login
                  <LogIn size={18} />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-600 font-bold hover:text-indigo-800 transition-colors">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
