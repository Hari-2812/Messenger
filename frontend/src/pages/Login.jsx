import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';

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
        <div className="w-10 h-10 border-4 border-primary border-t-accent rounded-full animate-spin" />
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
      toast.error(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-full bg-gradient-to-b from-primary/10 to-transparent blur-3xl -z-10 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-card p-8 sm:p-10 rounded-3xl shadow-2xl border border-border"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-16 items-center justify-center mb-6">
            <img src="/techzon-logo.png" alt="Techzon CRM" className="h-full object-contain" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-text tracking-tight mb-2 text-center">Welcome Back</h2>
          <p className="text-text-muted text-sm sm:text-base text-center">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <div>
            <label className="block text-sm font-semibold text-text mb-2">Email</label>
            <input
              type="email"
              autoComplete="email"
              {...register('email', { 
                required: 'Email is required.',
                pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Please enter a valid email address.' }
              })}
              className={`w-full bg-background border ${errors.email ? 'border-status-danger' : 'border-border'} rounded-xl px-4 py-3 text-text focus:outline-none focus:border-primary transition-colors`}
              placeholder="you@example.com"
            />
            {errors.email && <p className="mt-2 text-xs text-status-danger">{errors.email.message}</p>}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold text-text">Password</label>
            </div>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                {...register('password', { required: 'Password is required.' })}
                className={`w-full bg-background border ${errors.password ? 'border-status-danger' : 'border-border'} rounded-xl px-4 py-3 pr-12 text-text focus:outline-none focus:border-primary transition-colors`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
                tabIndex={-1}
                aria-label="Toggle password visibility"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="mt-2 text-xs text-status-danger">{errors.password.message}</p>}
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                {...register('remember')}
                className="w-4 h-4 text-primary border-border rounded focus:ring-primary bg-background"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-text-muted cursor-pointer">
                Remember me
              </label>
            </div>
            <Link to="/forgot-password" className="text-sm text-primary hover:text-primary-dark font-medium transition-colors">
              Forgot password?
            </Link>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={submitting}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                SIGN IN
                <LogIn size={18} />
              </>
            )}
          </motion.button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-text-muted">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary font-bold hover:text-primary-dark transition-colors">
              Register
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
