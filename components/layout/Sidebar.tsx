'use client';

import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  children: ReactNode;
  open?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ children, open = true, onToggle }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:relative z-30 lg:z-auto',
          'h-screen lg:h-auto',
          'flex-shrink-0',
          'bg-gray-950 border-r border-gray-800',
          'transition-transform duration-300',
          'overflow-y-auto',
          'lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
          'w-80'
        )}
      >
        {/* Mobile close button */}
        {onToggle && (
          <button
            onClick={onToggle}
            className="lg:hidden absolute top-4 right-4 text-gray-400 hover:text-white p-1"
          >
            ✕
          </button>
        )}

        <div className="p-4 space-y-1 min-h-full pb-8">{children}</div>
      </aside>
    </>
  );
}
