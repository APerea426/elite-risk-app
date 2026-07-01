import type { Metadata } from 'next';
import './globals.css';
import { createClient } from '@/lib/supabase/server';
import Nav from './nav';

export const metadata: Metadata = {
  title: 'Elite Risk',
  description: 'Elite Risk Advisory',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  let profile = null;
  if (authUser) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authUser.id)
      .single();
    profile = data;
  }

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
        {profile && <Nav user={profile} />}
        <main className="max-w-7xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
