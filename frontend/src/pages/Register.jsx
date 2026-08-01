import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, CheckCircle2, ShieldCheck, Zap, Users, BarChart } from 'lucide-react';
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

const PasswordStrengthMeter = ({ password }) => {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  const getStrengthColor = (s) => {
    if (s <= 1) return 'bg-status-danger';
    if (s === 2) return 'bg-status-warning';
    if (s === 3) return 'bg-yellow-500';
    if (s === 4) return 'bg-blue-500';
    return 'bg-status-success';
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
        <span className="text-xs text-text-muted">Password strength</span>
        <span className={`text-xs font-semibold ${password ? 'opacity-100' : 'opacity-0'}`}>
          {getStrengthText(strength)}
        </span>
      </div>
      <div className="flex gap-1 h-1.5 w-full bg-border rounded-full overflow-hidden">
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
        <div className="spinner w-10 h-10 border-primary border-t-accent" />
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
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
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
              Start scaling your <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-[#FF8F3D]">
                business communications
              </span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-primary-200 text-lg mb-10 leading-relaxed"
            >
              Join thousands of businesses managing bulk campaigns, automated replies, and team inboxes effortlessly.
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
            <h2 className="text-3xl font-bold text-text mb-2">Create your account</h2>
            <p className="text-text-muted font-medium">Start your 14-day free trial. No credit card required.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="form-group">
                <label className="block text-sm font-semibold text-text mb-1">First Name</label>
                <input
                  {...register('firstName', { required: 'First name is required' })}
                  className={`input-field ${errors.firstName ? 'border-status-danger ring-1 ring-status-danger' : ''}`}
                  placeholder="John"
                />
                {errors.firstName && <p className="mt-1 text-xs text-status-danger">{errors.firstName.message}</p>}
              </div>
              <div className="form-group">
                <label className="block text-sm font-semibold text-text mb-1">Last Name</label>
                <input
                  {...register('lastName', { required: 'Last name is required' })}
                  className={`input-field ${errors.lastName ? 'border-status-danger ring-1 ring-status-danger' : ''}`}
                  placeholder="Doe"
                />
                {errors.lastName && <p className="mt-1 text-xs text-status-danger">{errors.lastName.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="form-group">
                <label className="block text-sm font-semibold text-text mb-1">Company Name</label>
                <input
                  {...register('companyName', { required: 'Company name is required' })}
                  className={`input-field ${errors.companyName ? 'border-status-danger ring-1 ring-status-danger' : ''}`}
                  placeholder="Acme Inc."
                />
                {errors.companyName && <p className="mt-1 text-xs text-status-danger">{errors.companyName.message}</p>}
              </div>
              <div className="form-group">
                <label className="block text-sm font-semibold text-text mb-1">Phone Number</label>
                <input
                  {...register('phone', { 
                    required: 'Phone number is required',
                    pattern: { value: /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/, message: 'Invalid phone format' }
                  })}
                  className={`input-field ${errors.phone ? 'border-status-danger ring-1 ring-status-danger' : ''}`}
                  placeholder="+1 (555) 000-0000"
                />
                {errors.phone && <p className="mt-1 text-xs text-status-danger">{errors.phone.message}</p>}
              </div>
            </div>

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
              <label className="block text-sm font-semibold text-text mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'Minimum 8 characters' },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                      message: 'Must include uppercase, lowercase, number, and special character'
                    }
                  })}
                  className={`input-field pr-10 ${errors.password ? 'border-status-danger ring-1 ring-status-danger' : ''}`}
                  placeholder="Create a strong password"
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
              {!errors.password && passwordValue && <PasswordStrengthMeter password={passwordValue} />}
            </div>

            <div className="form-group relative">
              <label className="block text-sm font-semibold text-text mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (val) => val === passwordValue || 'Passwords do not match'
                  })}
                  className={`input-field pr-10 ${errors.confirmPassword ? 'border-status-danger ring-1 ring-status-danger' : ''}`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text focus:outline-none transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-xs text-status-danger">{errors.confirmPassword.message}</p>}
            </div>

            <div className="flex items-start gap-2 mt-2">
              <input
                type="checkbox"
                id="terms"
                {...register('terms', { required: 'You must agree to the terms' })}
                className="mt-1 w-4 h-4 text-primary border-border rounded focus:ring-primary"
              />
              <label htmlFor="terms" className="text-sm text-text-muted font-medium leading-tight">
                I agree to the <a href="#" className="text-primary hover:text-primary-hover font-bold transition-colors">Terms of Service</a> and <a href="#" className="text-primary hover:text-primary-hover font-bold transition-colors">Privacy Policy</a>
              </label>
            </div>
            {errors.terms && <p className="text-xs text-status-danger mt-0">{errors.terms.message}</p>}

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
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <CheckCircle2 size={18} />
                </>
              )}
            </motion.button>
          </form>

          <p className="mt-8 text-center text-sm text-text-muted font-medium">
            Already have an account?{' '}
            <Link to="/login" className="text-accent font-bold hover:text-accent-hover transition-colors">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
