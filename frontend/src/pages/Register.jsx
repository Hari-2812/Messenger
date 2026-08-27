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
  const [showConfirmPass, setShowConfirmPass] = useState(false);
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
        firstName: data.firstName,
        lastName: data.lastName,
        companyName: data.companyName,
        email: data.email,
        phone: data.phone,
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
    <div className="min-h-screen flex items-center justify-center bg-[#111827] px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-full bg-gradient-to-b from-[#F57C20]/10 to-transparent blur-3xl -z-10 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl bg-[#1f2937] p-8 sm:p-10 rounded-3xl shadow-2xl border border-white/10 my-8"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#F57C20] to-[#f59e0b] shadow-lg mb-6">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-white">
               <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
            </svg>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2 text-center">Create your account</h2>
          <p className="text-slate-400 text-sm sm:text-base text-center">Start managing your campaigns</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">First Name</label>
              <input
                {...register('firstName', { required: 'First name is required.' })}
                className={`w-full bg-[#374151] border ${errors.firstName ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F57C20] transition-colors`}
                placeholder="John"
              />
              {errors.firstName && <p className="mt-2 text-xs text-red-400">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Last Name</label>
              <input
                {...register('lastName', { required: 'Last name is required.' })}
                className={`w-full bg-[#374151] border ${errors.lastName ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F57C20] transition-colors`}
                placeholder="Doe"
              />
              {errors.lastName && <p className="mt-2 text-xs text-red-400">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Company Name</label>
              <input
                {...register('companyName', { required: 'Company name is required.' })}
                className={`w-full bg-[#374151] border ${errors.companyName ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F57C20] transition-colors`}
                placeholder="Acme Inc."
              />
              {errors.companyName && <p className="mt-2 text-xs text-red-400">{errors.companyName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Phone Number</label>
              <input
                {...register('phone', { 
                  required: 'Phone number is required.',
                  pattern: { value: /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/, message: 'Invalid phone format.' }
                })}
                className={`w-full bg-[#374151] border ${errors.phone ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F57C20] transition-colors`}
                placeholder="+1 (555) 000-0000"
              />
              {errors.phone && <p className="mt-2 text-xs text-red-400">{errors.phone.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Email Address</label>
            <input
              type="email"
              autoComplete="email"
              {...register('email', { 
                required: 'Email is required.',
                pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Please enter a valid email address.' }
              })}
              className={`w-full bg-[#374151] border ${errors.email ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F57C20] transition-colors`}
              placeholder="you@example.com"
            />
            {errors.email && <p className="mt-2 text-xs text-red-400">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...register('password', {
                    required: 'Password is required.',
                    minLength: { value: 8, message: 'Minimum 8 characters.' },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                      message: 'Must include uppercase, lowercase, number, and special character.'
                    }
                  })}
                  className={`w-full bg-[#374151] border ${errors.password ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 pr-12 text-white focus:outline-none focus:border-[#F57C20] transition-colors`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="mt-2 text-xs text-red-400">{errors.password.message}</p>}
              {!errors.password && passwordValue && <PasswordStrengthMeter password={passwordValue} />}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...register('confirmPassword', {
                    required: 'Please confirm your password.',
                    validate: (val) => val === passwordValue || 'Passwords do not match.'
                  })}
                  className={`w-full bg-[#374151] border ${errors.confirmPassword ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 pr-12 text-white focus:outline-none focus:border-[#F57C20] transition-colors`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-2 text-xs text-red-400">{errors.confirmPassword.message}</p>}
            </div>
          </div>

          <div className="flex items-start gap-2 mt-2">
            <input
              type="checkbox"
              id="terms"
              {...register('terms', { required: 'You must agree to the terms.' })}
              className="mt-1 w-4 h-4 text-[#F57C20] border-white/20 rounded focus:ring-[#F57C20] bg-[#374151]"
            />
            <label htmlFor="terms" className="text-sm text-slate-400 font-medium leading-relaxed">
              I agree to the <a href="#" className="text-[#F57C20] hover:text-orange-400 transition-colors">Terms of Service</a> and <a href="#" className="text-[#F57C20] hover:text-orange-400 transition-colors">Privacy Policy</a>
            </label>
          </div>
          {errors.terms && <p className="text-xs text-red-400 mt-0">{errors.terms.message}</p>}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={submitting}
            className="w-full bg-[#F57C20] hover:bg-orange-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-orange-500/20 transition-all flex justify-center items-center gap-2 mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
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
          <p className="text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-[#F57C20] font-bold hover:text-orange-400 transition-colors">
              Login
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
