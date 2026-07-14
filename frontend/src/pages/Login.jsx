import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react';

const Login = () => {
  const { user, login, loading } = useAuth();
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    mode: 'onTouched',
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-950">
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
    <div className="min-h-screen flex items-center justify-center bg-indigo-950 relative overflow-hidden p-6">
      {/* Animated Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/30 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/20 animate-fade-in relative z-10">
        
        {/* Logo and Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30 mb-4">
            <svg viewBox="0 0 24 24" fill="white" className="w-8 h-8">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a7.003 7.003 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M11.5 2C6.262 2 2 6.262 2 11.5c0 1.836.528 3.55 1.442 5L2 22l5.664-1.41A9.427 9.427 0 0011.5 21c5.238 0 9.5-4.262 9.5-9.5S16.738 2 11.5 2z" opacity="0.8"/>
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Welcome back</h2>
          <p className="text-indigo-200 mt-2">Sign in to your dashboard</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="form-group">
            <label className="block text-sm font-medium text-indigo-100 mb-1">Email Address</label>
            <input
              type="email"
              {...register('email', { 
                required: 'Email is required',
                pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email address' }
              })}
              className={`w-full px-4 py-3 rounded-xl border ${errors.email ? 'border-red-400 focus:ring-red-400' : 'border-white/20 focus:ring-emerald-400'} bg-white/5 text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
              placeholder="you@company.com"
            />
            {errors.email && <p className="mt-1 text-xs text-red-300">{errors.email.message}</p>}
          </div>

          <div className="form-group">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-indigo-100">Password</label>
              <Link to="/forgot-password" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                {...register('password', { required: 'Password is required' })}
                className={`w-full px-4 py-3 rounded-xl border ${errors.password ? 'border-red-400 focus:ring-red-400' : 'border-white/20 focus:ring-emerald-400'} bg-white/5 text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:border-transparent transition-all pr-10`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-300 hover:text-white focus:outline-none"
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-300">{errors.password.message}</p>}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="remember"
              {...register('remember')}
              className="w-4 h-4 text-emerald-500 border-white/20 bg-white/10 rounded focus:ring-emerald-500 focus:ring-offset-indigo-900"
            />
            <label htmlFor="remember" className="ml-2 text-sm text-indigo-200">
              Remember me for 30 days
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 px-4 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex justify-center items-center gap-2 mt-2"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <LogIn size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 flex items-center gap-4">
          <div className="flex-1 h-px bg-white/10"></div>
          <p className="text-sm text-indigo-300">or</p>
          <div className="flex-1 h-px bg-white/10"></div>
        </div>

        <p className="mt-6 text-center text-sm text-indigo-200">
          Don't have an account?{' '}
          <Link to="/register" className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors">
            Create an account
          </Link>
        </p>

        <div className="mt-8 flex items-center justify-center gap-2 text-indigo-300/50 text-xs">
          <ShieldCheck size={14} />
          <p>Secured with enterprise-grade encryption</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
