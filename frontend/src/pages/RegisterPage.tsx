import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const ROLES = [
  { value: 'user', label: 'Individual', desc: 'Personal emotional tracking' },
  { value: 'couples', label: 'Couples', desc: 'Shared emotional dynamics' },
  { value: 'executive', label: 'Executive', desc: 'Leadership stress tracking' },
  { value: 'therapist', label: 'Therapist', desc: 'Client pattern monitoring' },
];

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'user' });
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { user, token } = await authApi.register(form);
      setAuth(token, user);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-gradient-radial from-accent-dim/15 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-lg animate-fade-in">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span className="text-primary text-lg">⚡</span>
            </div>
            <span className="font-display font-bold text-xl tracking-tight">TriggerIQ</span>
          </div>
          <h1 className="font-display text-3xl font-bold mb-2">Create your account</h1>
          <p className="text-subtle">Start understanding your emotional patterns</p>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-8 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-subtle mb-1.5">Full name</label>
              <input
                type="text"
                value={form.full_name}
                onChange={set('full_name')}
                required
                className="w-full bg-midnight border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
                placeholder="Alex Johnson"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-subtle mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                required
                className="w-full bg-midnight border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-subtle mb-1.5">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                required
                minLength={8}
                className="w-full bg-midnight border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
                placeholder="Min 8 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-subtle mb-2">Account type</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, role: r.value }))}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      form.role === r.value
                        ? 'border-primary/60 bg-primary/10'
                        : 'border-border bg-midnight hover:border-muted'
                    }`}
                  >
                    <div className="font-medium text-sm">{r.label}</div>
                    <div className="text-xs text-subtle mt-0.5">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/80 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-glow"
            >
              {loading ? 'Creating account...' : 'Create free account'}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-subtle text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
