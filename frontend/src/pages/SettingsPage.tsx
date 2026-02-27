import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { subscriptionsApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const PLANS = [
  {
    tier: 'free',
    name: 'Free',
    price: '$0',
    features: ['Unlimited trigger logging', 'Basic scoring', 'History view'],
    cta: null,
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: '$12/mo',
    features: ['Everything in Free', 'AI pattern clustering', 'Weekly AI summaries', 'Escalation detection', 'Regulation scripts', 'Relationship connect'],
    cta: 'Upgrade to Pro',
    highlight: true,
  },
  {
    tier: 'executive',
    name: 'Executive',
    price: '$29/mo',
    features: ['Everything in Pro', 'Executive mode dashboard', 'Advanced trend analysis', 'Priority AI processing', 'Therapist link mode'],
    cta: 'Upgrade to Executive',
  },
];

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState('billing');

  const checkoutMut = useMutation({
    mutationFn: subscriptionsApi.checkout,
    onSuccess: ({ url }) => { window.location.href = url; },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Checkout failed'),
  });

  const portalMut = useMutation({
    mutationFn: subscriptionsApi.portal,
    onSuccess: ({ url }) => { window.location.href = url; },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Portal failed'),
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="font-display text-2xl font-bold mb-6">Settings</h1>

      <div className="flex gap-2 mb-8 border-b border-border">
        {['billing', 'account'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'px-4 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-all',
              activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-subtle hover:text-white'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'billing' && (
        <div>
          {/* Current plan */}
          <div className="bg-surface border border-border rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-subtle text-sm mb-1">Current Plan</div>
                <div className="font-display text-2xl font-bold capitalize">{user?.tier || 'Free'}</div>
              </div>
              {(user?.tier === 'pro' || user?.tier === 'executive') && (
                <button
                  onClick={() => portalMut.mutate()}
                  disabled={portalMut.isPending}
                  className="px-4 py-2 bg-surface-2 border border-border rounded-xl text-sm hover:border-primary/40 transition-all"
                >
                  Manage Billing
                </button>
              )}
            </div>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-3 gap-4">
            {PLANS.map((plan) => (
              <div
                key={plan.tier}
                className={clsx(
                  'bg-surface rounded-2xl border p-6 relative',
                  plan.highlight ? 'border-primary/50 shadow-glow' : 'border-border',
                  user?.tier === plan.tier ? 'ring-2 ring-primary/30' : ''
                )}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs px-3 py-1 rounded-full font-semibold">
                    Most Popular
                  </div>
                )}
                <div className="font-display font-bold text-lg mb-1">{plan.name}</div>
                <div className="text-2xl font-black text-gradient mb-4">{plan.price}</div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="text-sm text-subtle flex items-start gap-2">
                      <span className="text-success mt-0.5">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {plan.cta && user?.tier !== plan.tier ? (
                  <button
                    onClick={() => checkoutMut.mutate(plan.tier)}
                    disabled={checkoutMut.isPending}
                    className={clsx(
                      'w-full py-2.5 rounded-xl text-sm font-semibold transition-all',
                      plan.highlight
                        ? 'bg-primary hover:bg-primary/80 text-white shadow-glow'
                        : 'bg-surface-2 border border-border hover:border-primary/40'
                    )}
                  >
                    {plan.cta}
                  </button>
                ) : user?.tier === plan.tier ? (
                  <div className="w-full py-2.5 rounded-xl text-sm text-center border border-primary/30 text-primary">
                    Current Plan
                  </div>
                ) : (
                  <div className="w-full py-2.5 rounded-xl text-sm text-center border border-border text-subtle">
                    Free Forever
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'account' && (
        <div className="bg-surface border border-border rounded-2xl p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-subtle text-xs uppercase tracking-wider mb-1">Name</div>
              <div className="font-medium">{user?.full_name}</div>
            </div>
            <div>
              <div className="text-subtle text-xs uppercase tracking-wider mb-1">Email</div>
              <div className="font-medium">{user?.email}</div>
            </div>
            <div>
              <div className="text-subtle text-xs uppercase tracking-wider mb-1">Account Type</div>
              <div className="font-medium capitalize">{user?.role}</div>
            </div>
            <div>
              <div className="text-subtle text-xs uppercase tracking-wider mb-1">Subscription</div>
              <div className="font-medium capitalize">{user?.tier}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
