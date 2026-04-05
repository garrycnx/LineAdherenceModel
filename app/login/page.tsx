'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  isAdminSetup,
  setupAdmin,
  loginAdmin,
  loginAgent,
  getAgents,
} from '@/lib/store';
import { useAuth } from '@/components/auth/AuthProvider';

type Mode = 'choose' | 'admin' | 'agent' | 'setup';

export default function LoginPage() {
  const router = useRouter();
  const { session, refresh } = useAuth();
  const [mode, setMode] = useState<Mode>('choose');

  // Admin login state
  const [adminId, setAdminId] = useState('');
  const [adminPw, setAdminPw] = useState('');

  // Setup state (first-time admin creation)
  const [setupId, setSetupId] = useState('');
  const [setupPw, setSetupPw] = useState('');
  const [setupPw2, setSetupPw2] = useState('');

  // Agent login state
  const [empId, setEmpId] = useState('');

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) {
      router.replace(session.role === 'admin' ? '/' : '/portal');
    }
  }, [session, router]);

  useEffect(() => {
    if (!isAdminSetup()) setMode('setup');
  }, []);

  function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const s = loginAdmin(adminId, adminPw);
    if (!s) {
      setError('Invalid admin ID or password.');
      setBusy(false);
      return;
    }
    refresh();
    router.replace('/');
  }

  function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    if (!setupId.trim()) return setError('Admin ID is required.');
    if (setupPw.length < 6) return setError('Password must be at least 6 characters.');
    if (setupPw !== setupPw2) return setError('Passwords do not match.');
    setupAdmin(setupId.trim(), setupPw);
    const s = loginAdmin(setupId.trim(), setupPw);
    if (s) { refresh(); router.replace('/'); }
  }

  function handleAgentLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const s = loginAgent(empId.trim());
    if (!s) {
      const agents = getAgents();
      if (agents.length === 0) {
        setError('No agents have been set up yet. Ask your administrator.');
      } else {
        setError('Employee ID not found. Check with your administrator.');
      }
      setBusy(false);
      return;
    }
    refresh();
    router.replace('/portal');
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-xl">
            🗓️
          </div>
          <div>
            <p className="text-lg font-bold text-white leading-tight">WFM Club</p>
            <p className="text-xs text-gray-400">AI Schedule Generator</p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm">
        {/* Setup mode */}
        {mode === 'setup' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-1">First-Time Setup</h2>
            <p className="text-sm text-gray-400 mb-5">Create your administrator account.</p>
            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Admin ID</label>
                <input
                  className="input-field w-full"
                  value={setupId}
                  onChange={(e) => setSetupId(e.target.value)}
                  placeholder="e.g. ADMIN01"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Password</label>
                <input
                  type="password"
                  className="input-field w-full"
                  value={setupPw}
                  onChange={(e) => setSetupPw(e.target.value)}
                  placeholder="Min. 6 characters"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Confirm Password</label>
                <input
                  type="password"
                  className="input-field w-full"
                  value={setupPw2}
                  onChange={(e) => setSetupPw2(e.target.value)}
                  placeholder="Repeat password"
                />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button type="submit" className="btn-primary w-full">
                Create Admin Account →
              </button>
            </form>
          </div>
        )}

        {/* Choose mode */}
        {mode === 'choose' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-1">Sign In</h2>
            <p className="text-sm text-gray-400 mb-6">Choose how you want to log in.</p>
            <div className="space-y-3">
              <button
                onClick={() => setMode('admin')}
                className="w-full bg-brand-600 hover:bg-brand-500 text-white rounded-xl px-4 py-3.5 text-sm font-medium transition-colors flex items-center gap-3"
              >
                <span className="text-xl">🔐</span>
                <div className="text-left">
                  <p className="font-semibold">Administrator</p>
                  <p className="text-xs text-white/70">Manage schedules, agents & settings</p>
                </div>
              </button>
              <button
                onClick={() => setMode('agent')}
                className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-xl px-4 py-3.5 text-sm font-medium transition-colors flex items-center gap-3"
              >
                <span className="text-xl">👤</span>
                <div className="text-left">
                  <p className="font-semibold">Agent / Employee</p>
                  <p className="text-xs text-gray-400">View your schedule</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Admin login */}
        {mode === 'admin' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <button
              onClick={() => { setMode('choose'); setError(''); }}
              className="text-xs text-gray-500 hover:text-gray-300 mb-4 flex items-center gap-1"
            >
              ← Back
            </button>
            <h2 className="text-lg font-semibold text-white mb-1">Admin Login</h2>
            <p className="text-sm text-gray-400 mb-5">Enter your administrator credentials.</p>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Admin ID</label>
                <input
                  className="input-field w-full"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  placeholder="Your admin ID"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Password</label>
                <input
                  type="password"
                  className="input-field w-full"
                  value={adminPw}
                  onChange={(e) => setAdminPw(e.target.value)}
                  placeholder="Password"
                />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button type="submit" disabled={busy} className="btn-primary w-full">
                {busy ? 'Signing in…' : 'Sign In →'}
              </button>
            </form>
          </div>
        )}

        {/* Agent login */}
        {mode === 'agent' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <button
              onClick={() => { setMode('choose'); setError(''); }}
              className="text-xs text-gray-500 hover:text-gray-300 mb-4 flex items-center gap-1"
            >
              ← Back
            </button>
            <h2 className="text-lg font-semibold text-white mb-1">Agent Login</h2>
            <p className="text-sm text-gray-400 mb-5">Enter your Employee ID to view your schedule.</p>
            <form onSubmit={handleAgentLogin} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Employee ID</label>
                <input
                  className="input-field w-full"
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value)}
                  placeholder="e.g. EMP001"
                  autoFocus
                />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button type="submit" disabled={busy} className="btn-primary w-full">
                {busy ? 'Signing in…' : 'View My Schedule →'}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-xs text-gray-600 mt-6">
          WFM Club · AI Schedule Generator · v2.0
        </p>
      </div>
    </div>
  );
}
