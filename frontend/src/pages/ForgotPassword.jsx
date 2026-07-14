import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { KeyRound, ArrowLeft, Mail } from 'lucide-react';

const ForgotPassword = () => {
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    mode: 'onTouched',
  });

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      // Placeholder for actual API call
      // await api.post('/auth/forgot-password', data);
      console.log('Sending reset email to:', data.email);
      await new Promise(resolve => setTimeout(resolve, 1500)); // simulate network delay
      
      setIsSubmitted(true);
      toast.success('Reset link sent to your email!');
    } catch (err) {
      toast.error('Failed to send reset link. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute top-[-15%] left-[-5%] w-[40%] h-[40%] bg-indigo-200/50 rounded-full blur-[80px]"></div>
      <div className="absolute bottom-[-15%] right-[-5%] w-[40%] h-[40%] bg-emerald-200/40 rounded-full blur-[80px]"></div>

      <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-gray-100 relative z-10 animate-fade-in">
        
        {/* Icon & Title */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5">
            <KeyRound size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Forgot Password?</h2>
          <p className="text-gray-500 mt-2 text-sm">
            {isSubmitted 
              ? "We've sent a password reset link to your email. Please check your inbox."
              : "No worries, we'll send you reset instructions."
            }
          </p>
        </div>

        {!isSubmitted ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email address' }
                  })}
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border ${errors.email ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-indigo-500'} bg-white focus:outline-none focus:ring-2 transition-all`}
                  placeholder="you@company.com"
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex justify-center items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => setIsSubmitted(false)}
              className="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium py-3 px-4 rounded-xl transition-colors"
            >
              Try another email
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors font-medium">
            <ArrowLeft size={16} />
            Back to log in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
