import { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserPlus } from 'lucide-react';

interface RegisterFormProps {
  onToggleMode: () => void;
}

type Role = 'student' | 'vendor' | 'delivery';

export function RegisterForm({ onToggleMode }: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('student');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { signUp } = useAuth();

  // derived validations
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const requiresStudentDomain = role === 'student';
  const emailValidForStudent =
    !requiresStudentDomain || normalizedEmail.endsWith('@student.usm.my');

  const canSubmit =
    !!fullName.trim() &&
    !!normalizedEmail &&
    password.length >= 6 &&
    emailValidForStudent &&
    !loading;

  // dynamic placeholder for email field
  const emailPlaceholder =
    role === 'student' ? 'your.email@student.usm.my' : 'you@example.com';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // client-side guard for student email domain
    if (requiresStudentDomain && !emailValidForStudent) {
      setError('Please use your @student.usm.my email to register as a student.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await signUp(normalizedEmail, password, fullName.trim(), role);

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <UserPlus className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
            Registration Successful!
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
            Your account has been created. You can now sign in.
          </p>
          <button
            onClick={onToggleMode}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-all"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
            <UserPlus className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-2">Create Account</h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">Join USM Cafeteria System</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Full name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white dark:bg-white text-gray-900 dark:text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Enter your full name"
            />
          </div>

          {/* Email */}
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
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all ${requiresStudentDomain && email && !emailValidForStudent
                  ? 'border-red-300 focus:ring-red-200'
                  : 'border-gray-300 focus:ring-blue-500'
                }`}
              placeholder={emailPlaceholder}
            />
            {requiresStudentDomain && (
              <p
                className={`mt-1 text-xs ${email && !emailValidForStudent ? 'text-red-600' : 'text-gray-500'
                  }`}
              >
                Only USM student emails (<code>@student.usm.my</code>) can register as{' '}
                <strong>Student</strong>.
              </p>
            )}
          </div>

          {/* Password */}
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
              minLength={6}
              className="w-full px-4 py-3 bg-white dark:bg-white text-gray-900 dark:text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Minimum 6 characters"
            />
          </div>

          {/* Role */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Register As
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full px-4 py-3 bg-white dark:bg-white text-gray-900 dark:text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="student">Student/Customer</option>
              <option value="vendor">Vendor/Cafe Owner</option>
              <option value="delivery">Delivery Personnel</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onToggleMode}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm"
          >
            Already have an account? Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
