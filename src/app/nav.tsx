'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@/types/database';

interface NavProps {
  user: User;
}

export default function Nav({ user }: NavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteSubmitted, setNoteSubmitted] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  async function handleNoteSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Stubbed — will be wired to internal_feedback table in Module 10
    setNoteSubmitted(true);
    setNoteText('');
    setTimeout(() => {
      setNoteSubmitted(false);
      setNoteOpen(false);
    }, 2000);
  }

  const linkClass = (href: string) =>
    `text-sm px-3 py-1.5 rounded-md transition-colors ${
      pathname === href || pathname.startsWith(href + '/')
        ? 'bg-indigo-800 text-white'
        : 'text-indigo-100 hover:bg-indigo-800 hover:text-white'
    }`;

  const disabledClass = 'text-sm px-3 py-1.5 text-indigo-300 cursor-not-allowed';

  return (
    <>
      <nav className="bg-indigo-900 text-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          {/* Left: Logo */}
          <Link href="/dashboard" className="font-bold text-lg tracking-tight text-white">
            Elite Risk
          </Link>

          {/* Center: Nav links */}
          <div className="flex items-center gap-1">
            <Link href="/dashboard" className={linkClass('/dashboard')}>Dashboard</Link>
            <Link href="/prospects" className={linkClass('/prospects')}>Prospects</Link>
            <Link href="/clients" className={linkClass('/clients')}>Clients</Link>
            <span className={disabledClass} title="Coming soon">🔔</span>
            {user.role === 'admin' && (
              <>
                <span className="mx-2 text-indigo-600">|</span>
                <Link href="/admin/activity-log" className={linkClass('/admin/activity-log')}>Activity Log</Link>
                <Link href="/admin/users" className={linkClass('/admin/users')}>Users</Link>
                <Link href="/admin/settings" className={linkClass('/admin/settings')}>Settings</Link>
              </>
            )}
          </div>

          {/* Right: Note button + user + sign out */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setNoteOpen(true)}
              className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-md font-medium transition-colors"
            >
              Make a Note About This System
            </button>
            <span className="text-sm text-indigo-300">{user.email}</span>
            <button
              onClick={handleSignOut}
              className="text-sm text-indigo-300 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Make a Note modal */}
      {noteOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Make a Note About This System</h2>
            <p className="text-sm text-slate-500 mb-4">Leave feedback, report a bug, or request a feature.</p>
            {noteSubmitted ? (
              <p className="text-green-600 font-medium text-center py-4">Thanks! Note received.</p>
            ) : (
              <form onSubmit={handleNoteSubmit} className="space-y-4">
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  required
                  rows={4}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Describe the issue or idea…"
                />
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setNoteOpen(false)}
                    className="text-sm text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-700 hover:bg-indigo-800 text-white text-sm px-4 py-2 rounded-lg"
                  >
                    Submit
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
