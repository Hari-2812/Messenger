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
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      {/* Left Column - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 bg-primary relative flex-col items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center mix-blend-overlay opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/80 to-transparent" />
        
        <div className="relative z-10 text-center max-w-lg">
          <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-md mb-8 inline-block shadow-2xl border border-white/20">
            <img src="/techzon-logo.png" alt="Techzon CRM" className="h-16 object-contain filter brightness-0 invert" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-6 leading-tight">
            Start Growing with Techzon CRM
          </h1>
          <p className="text-primary-light text-lg mb-8 opacity-90">
            Join thousands of businesses managing their contacts and automating email campaigns efficiently.
          </p>
          <div className="flex gap-3 justify-center">
            <div className="w-2 h-2 rounded-full bg-white opacity-40" />
            <div className="w-2 h-2 rounded-full bg-white opacity-100" />
            <div className="w-2 h-2 rounded-full bg-white opacity-40" />
          </div>
        </div>
      </div>

      {/* Right Column - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative overflow-y-auto">
        {/* Mobile Background Effect */}
        <div className="lg:hidden absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-full bg-gradient-to-b from-primary/5 to-transparent blur-3xl -z-10 pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md py-8"
        >
          <div className="flex flex-col mb-10">
            <div className="flex h-12 lg:hidden items-center justify-start mb-8">
              <img src="/techzon-logo.png" alt="Techzon CRM" className="h-full object-contain" />
            </div>
            <h2 className="text-3xl font-bold text-text tracking-tight mb-2">Create Account</h2>
            <p className="text-text-muted text-base">Sign up to get started with Techzon.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div>
              <label className="block text-sm font-semibold text-text mb-1.5">Full Name</label>
              <input
                type="text"
                autoComplete="name"
                {...register('name', { required: 'Name is required.' })}
                className={`w-full bg-white border ${errors.name ? 'border-status-danger' : 'border-border'} rounded-xl px-4 py-3 text-text focus:outline-none focus:border-primary transition-colors shadow-sm`}
                placeholder="John Doe"
              />
              {errors.name && <p className="mt-1.5 text-xs text-status-danger font-medium">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-text mb-1.5">Email</label>
              <input
                type="email"
                autoComplete="email"
                {...register('email', { 
                  required: 'Email is required.',
                  pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Please enter a valid email address.' }
                })}
                className={`w-full bg-white border ${errors.email ? 'border-status-danger' : 'border-border'} rounded-xl px-4 py-3 text-text focus:outline-none focus:border-primary transition-colors shadow-sm`}
                placeholder="you@example.com"
              />
              {errors.email && <p className="mt-1.5 text-xs text-status-danger font-medium">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-text mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...register('password', { 
                    required: 'Password is required.',
                    minLength: { value: 6, message: 'Password must be at least 6 characters.' }
                  })}
                  className={`w-full bg-white border ${errors.password ? 'border-status-danger' : 'border-border'} rounded-xl px-4 py-3 pr-12 text-text focus:outline-none focus:border-primary transition-colors shadow-sm`}
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
              <PasswordStrengthMeter password={passwordValue} />
              {errors.password && <p className="mt-1.5 text-xs text-status-danger font-medium">{errors.password.message}</p>}
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={submitting}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 mt-8 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <UserPlus size={18} />
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-sm text-text-muted">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-bold hover:text-primary-dark transition-colors">
                Sign In
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
