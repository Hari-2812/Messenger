import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, LogIn, ShieldCheck, Zap, Users, BarChart } from 'lucide-react';
import { motion } from 'framer-motion';

const FeaturePill = ({ icon: Icon, title, description, delay }) => (
  <motion.div 
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.5 }}
    className="flex items-start gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-colors"
  >
    <div className="p-2 bg-white/20 rounded-xl text-white">
      <Icon size={24} />
    </div>
    <div>
      <h3 className="text-white font-semibold mb-1">{title}</h3>
      <p className="text-primary-200 text-sm">{description}</p>
    </div>
  </motion.div>
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="spinner w-10 h-10 border-primary border-t-accent" />
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
    <div className="min-h-screen flex bg-background">
      {/* Left Panel — Branding & Features */}
      <div className="hidden lg:flex lg:w-[45%] flex-col relative overflow-hidden bg-primary">
        {/* Animated Background Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/30 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-status-success/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Logo */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-12"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-accent to-[#FF8F3D] shadow-lg shadow-accent/30">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-lg tracking-wide">Omni CRM</p>
              <p className="text-primary-300 text-xs font-medium uppercase tracking-wider">Enterprise Edition</p>
            </div>
          </motion.div>

          <div className="flex-1 flex flex-col justify-center max-w-md">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6"
            >
              Welcome back to your <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-[#FF8F3D]">
                dashboard
              </span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-primary-200 text-lg mb-10 leading-relaxed"
            >
              Sign in to manage your campaigns, view real-time analytics, and communicate with your audience.
            </motion.p>

            <div className="space-y-4">
              <FeaturePill 
                delay={0.3}
                icon={Zap} 
                title="Omnichannel Campaigns" 
                description="Send personalized messages across WhatsApp and Email instantly." 
              />
              <FeaturePill 
                delay={0.4}
                icon={Users} 
                title="Unified Contact Management" 
                description="Sync and manage your contacts with advanced filtering." 
              />
              <FeaturePill 
                delay={0.5}
                icon={BarChart} 
                title="Real-Time Analytics" 
                description="Track delivery, read rates, and campaign ROI in real-time." 
              />
            </div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-12 flex items-center gap-4 text-primary-200/80 text-sm"
          >
            <ShieldCheck size={20} />
            <p>Enterprise Grade Security · GDPR Compliant · 99.9% Uptime</p>
          </motion.div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 h-screen overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-xl bg-card rounded-3xl p-8 sm:p-10 shadow-elevated border border-border my-8"
        >
          
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-accent to-[#FF8F3D] shadow-md">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                 <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
            </div>
            <span className="font-bold text-text text-xl tracking-tight">Omni CRM</span>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-text mb-2">Welcome back</h2>
            <p className="text-text-muted">Sign in to your dashboard to manage campaigns.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="form-group">
              <label className="block text-sm font-semibold text-text mb-1">Email Address</label>
              <input
                type="email"
                {...register('email', { 
                  required: 'Email is required',
                  pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email address' }
                })}
                className={`input-field ${errors.email ? 'border-status-danger ring-1 ring-status-danger' : ''}`}
                placeholder="you@company.com"
              />
              {errors.email && <p className="mt-1 text-xs text-status-danger">{errors.email.message}</p>}
            </div>

            <div className="form-group relative">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-semibold text-text">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary hover:text-primary-hover transition-colors font-semibold">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  {...register('password', { required: 'Password is required' })}
                  className={`input-field pr-10 ${errors.password ? 'border-status-danger ring-1 ring-status-danger' : ''}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text focus:outline-none transition-colors"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-status-danger">{errors.password.message}</p>}
            </div>

            <div className="flex items-center mt-2">
              <input
                type="checkbox"
                id="remember"
                {...register('remember')}
                className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-text-muted font-medium">
                Remember me for 30 days
              </label>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary-hover hover:to-primary text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex justify-center items-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
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
            </motion.button>
          </form>

          <p className="mt-8 text-center text-sm text-text-muted font-medium">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent font-bold hover:text-accent-hover transition-colors">
              Create Account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
