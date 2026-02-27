import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { user, token } = await authApi.login(email, password);
      setAuth(token, user);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center px-4">
      {/* Ambient gradient */}
      <div className="fixed inset-0 bg-gradient-radial from-primary-dim/20 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span className="text-primary text-lg">⚡</span>
            </div>
            <span className="font-display font-bold text-xl tracking-tight">TriggerIQ</span>
          </div>
          <h1 className="font-display text-3xl font-bold mb-2">Welcome back</h1>
          <p className="text-subtle">Continue your emotional intelligence journey</p>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-8 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-subtle mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-midnight border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-subtle mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-midnight border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/80 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-glow hover:shadow-glow"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-subtle text-sm">
          No account yet?{' '}
          <Link to="/register" className="text-primary hover:underline">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}
