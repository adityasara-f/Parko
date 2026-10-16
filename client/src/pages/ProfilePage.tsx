import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { User, Phone, Mail, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!user) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await apiRequest('/auth/me', {
      method: 'PUT',
      body: JSON.stringify({ name, phone }),
    });

    if (res.success) {
      setMessage('Profile updated successfully.');
      refreshUser();
    } else {
      alert(res.error || 'Failed to update profile');
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl p-8 border border-parko-border shadow-soft space-y-6">
        
        <div className="flex items-center gap-4 border-b border-parko-border pb-6">
          <div className="w-14 h-14 rounded-2xl bg-parko-charcoal text-white flex items-center justify-center font-extrabold text-2xl shadow-soft">
            {user.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-parko-charcoal">
              {user.name}
            </h1>
            <p className="text-xs text-parko-muted">
              {user.email} &bull; Member Account #{user.user_id}
            </p>
          </div>
        </div>

        {message && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 rounded-xl font-semibold">
            {message}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-parko-charcoal mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-parko-border text-xs font-medium focus:ring-1 focus:ring-parko-coral"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-parko-charcoal mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-parko-border text-xs font-medium focus:ring-1 focus:ring-parko-coral"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-parko-muted mb-1">
              Email Address (Frozen attribute)
            </label>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full p-2.5 rounded-xl border border-parko-border bg-stone-50 text-xs font-medium text-parko-muted cursor-not-allowed"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-2xl bg-parko-charcoal text-white text-xs font-bold hover:bg-black transition-colors"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>

        <div className="pt-6 border-t border-parko-border flex items-center justify-between text-xs text-parko-muted">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Account Status: <span className="font-bold text-emerald-700">{user.account_status.toUpperCase()}</span></span>
          </div>

          {user.is_admin && (
            <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-[10px] font-extrabold uppercase">
              Platform Admin
            </span>
          )}
        </div>

      </div>
    </div>
  );
};
