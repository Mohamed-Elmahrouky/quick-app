'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase-browser';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) { setError(authError.message); return; }
      if (data.user?.app_metadata?.role !== 'admin') {
        await supabase.auth.signOut();
        setError('Not an admin account.');
        return;
      }
      router.push('/admin');
      router.refresh();
    } catch {
      setError('Unexpected error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#faf8f5] flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-stone-200 w-full max-w-sm">
        <Link href="/" className="text-xs text-stone-500 hover:text-stone-800 transition mb-6 block">← Back</Link>
        <h1 className="text-xl font-bold text-stone-900 mb-6">Staff Login</h1>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Email</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition"
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs cursor-pointer">
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium transition disabled:opacity-40 cursor-pointer">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
