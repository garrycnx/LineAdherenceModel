'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { cn } from '@/lib/utils';

interface TopNavProps {
  className?: string;
}

export default function TopNav({ className }: TopNavProps) {
  const { session, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <header
      className={cn(
        'h-14 border-b border-gray-800 bg-gray-950/95 backdrop-blur-sm',
        'flex items-center justify-between px-4 md:px-6',
        'sticky top-0 z-40',
        className
      )}
    >
      {/* Brand */}
      <button
        onClick={() => router.push(session?.role === 'admin' ? '/' : '/portal')}
        className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
      >
        <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-sm">
          🗓️
        </div>
        <div className="hidden sm:block">
          <span className="text-sm font-bold text-white">WFM Club</span>
          <span className="text-xs text-gray-500 ml-2">Schedule Generator</span>
        </div>
      </button>

      {/* Nav links (admin only) */}
      {session?.role === 'admin' && (
        <nav className="flex items-center gap-1">
          <NavLink href="/" label="Scheduler" />
          <NavLink href="/portal" label="Agent Portal" />
        </nav>
      )}

      {/* User info + logout */}
      {session && (
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-medium text-white leading-tight">{session.name}</p>
            <p className="text-[10px] text-gray-500">
              {session.role === 'admin' ? 'Administrator' : `ID: ${session.userId}`}
            </p>
          </div>
          <div
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
              session.role === 'admin'
                ? 'bg-brand-600 text-white'
                : 'bg-gray-700 text-gray-200'
            )}
          >
            {session.name.charAt(0).toUpperCase()}
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-500 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-gray-800"
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  const isActive = typeof window !== 'undefined' && window.location.pathname === href;
  return (
    <a
      href={href}
      className={cn(
        'text-xs px-3 py-1.5 rounded-lg transition-colors',
        isActive
          ? 'bg-brand-600/20 text-brand-400'
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
      )}
    >
      {label}
    </a>
  );
}
