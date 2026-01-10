import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogIn } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LoginFormProps {
  onToggleMode: () => void;
}

export function LoginForm({ onToggleMode }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');
  const { signIn } = useAuth();

  // Read one-time flag set by AuthContext right before forced sign-out
  useEffect(() => {
    if (sessionStorage.getItem('blockedAccount') === '1') {
      setIsBlocked(true);
      setError('');
      sessionStorage.removeItem('blockedAccount'); // show only once
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsBlocked(false);
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('blocked')) {
        setIsBlocked(true);
        setError('');
      } else if (msg.includes('invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(error.message);
      }
    }

    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess(false);

    if (!resetEmail) {
      setResetError('Please enter your email address');
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin + '/auth/update-password',
      });
      if (error) throw error;
      setResetSuccess(true);
    } catch (err: any) {
      setResetError(err.message || 'Failed to send reset email');
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
            <LogIn className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-2">Welcome Back</h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">Sign in to your account</p>

        {isBlocked && (
          <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-xl p-6 text-center">
            <div className="flex justify-center mb-3">
              <div className="p-2 bg-red-100 rounded-full">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-bold text-red-900 mb-2">Account Blocked</h3>
            <p className="text-red-800 text-sm mb-2">
              Your account has been blocked by the administrator.
            </p>
            <p className="text-red-700 text-xs">
              Please contact the system administrator for assistance or further information.
            </p>

            {/* Admin contact (phone only) */}
            <div className="mt-3 flex flex-col items-center gap-1 text-sm">
              <a
                href="tel:1300888333"
                className="font-semibold text-red-800 underline"
                aria-label="Call admin at 1300888333"
              >
                📞 1300888333
              </a>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white dark:bg-white text-gray-900 dark:text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white dark:bg-white text-gray-900 dark:text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setShowForgotPassword(true)}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
          >
            Forgot Password?
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={onToggleMode}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm"
          >
            Don't have an account? Sign up
          </button>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white">
            {resetSuccess ? (
              <>
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-green-100 rounded-full">
                    <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Check Your Email</h3>
                <p className="text-center text-gray-600 mb-6">
                  We've sent a password reset link to <strong>{resetEmail}</strong>.
                  Please check your inbox and follow the instructions.
                </p>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetSuccess(false);
                    setResetEmail('');
                  }}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-all"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Reset Password</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Enter your email address and we'll send you a link to reset your password.
                </p>

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  {resetError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {resetError}
                    </div>
                  )}

                  <div>
                    <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      id="resetEmail"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setResetError('');
                        setResetEmail('');
                      }}
                      className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg font-medium hover:bg-gray-300 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-all"
                    >
                      Send Reset Link
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
