import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';

const PasswordStrengthMeter = ({ password }) => {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  const getStrengthColor = (s) => {
    if (s <= 1) return 'bg-red-500';
    if (s === 2) return 'bg-orange-500';
    if (s === 3) return 'bg-yellow-500';
    if (s === 4) return 'bg-blue-500';
    return 'bg-emerald-500';
  };

  const getStrengthText = (s) => {
    if (s === 0) return '';
    if (s <= 1) return 'Weak';
    if (s === 2) return 'Fair';
    if (s === 3) return 'Good';
    if (s === 4) return 'Strong';
    return 'Very Strong';
  };

  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-slate-400">Password strength</span>
        <span className={`text-xs font-semibold ${password ? 'opacity-100' : 'opacity-0'} text-slate-300`}>
          {getStrengthText(strength)}
        </span>
      </div>
      <div className="flex gap-1 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
        {[...Array(5)].map((_, index) => (
          <div
            key={index}
            className={`h-full flex-1 transition-colors duration-300 ${
              index < strength ? getStrengthColor(strength) : 'bg-transparent'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

const Register = () => {
  const { user, register: registerUser, loading } = useAuth();
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    mode: 'onTouched',
  });

  const passwordValue = watch('password', '');

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
      await registerUser({
        name: data.name.trim(),
        email: data.email.trim(),
        password: data.password,
      });
      toast.success('Account created successfully!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(msg);
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
        className="w-full max-w-md bg-card p-8 sm:p-10 rounded-3xl shadow-2xl border border-border my-8"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-primary shadow-lg mb-6 text-white">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-text tracking-tight mb-2 text-center">Create Account</h2>
          <p className="text-text-muted text-sm sm:text-base text-center">Join Omni CRM today</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div>
            <label className="block text-sm font-semibold text-text mb-2">Full Name</label>
            <input
              type="text"
              autoComplete="name"
              {...register('name', { required: 'Name is required.' })}
              className={`w-full bg-background border ${errors.name ? 'border-status-danger' : 'border-border'} rounded-xl px-4 py-3 text-text focus:outline-none focus:border-primary transition-colors`}
              placeholder="John Doe"
            />
            {errors.name && <p className="mt-2 text-xs text-status-danger">{errors.name.message}</p>}
          </div>

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
            <label className="block text-sm font-semibold text-text mb-2">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                autoComplete="new-password"
                {...register('password', { 
                  required: 'Password is required.',
                  minLength: { value: 6, message: 'Password must be at least 6 characters.' }
                })}
                className={`w-full bg-background border ${errors.password ? 'border-status-danger' : 'border-border'} rounded-xl px-4 py-3 pr-12 text-text focus:outline-none focus:border-primary transition-colors`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="mt-2 text-xs text-status-danger">{errors.password.message}</p>}
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={submitting}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account...
              </>
            ) : (
              <>
                CREATE ACCOUNT
                <UserPlus size={18} />
              </>
            )}
          </motion.button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-text-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-bold hover:text-primary-dark transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
