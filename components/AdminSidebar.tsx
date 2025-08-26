"use client";

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface AdminSidebarProps {
  activeTab: 'submit' | 'view' | 'manage' | 'logs';
  onTabChange: (tab: 'submit' | 'view' | 'manage' | 'logs') => void;
}

export default function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const router = useRouter();

  const items: { key: AdminSidebarProps['activeTab']; label: string }[] = [
    { key: 'submit', label: 'Submit Task' },
    { key: 'view', label: 'View Tasks' },
    { key: 'manage', label: 'Manage (Admin)' },
    { key: 'logs', label: 'Logs' },
  ];

  return (
    <aside className="w-64 shrink-0 border-r bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 fixed lg:static inset-x-0 top-0 lg:top-auto z-40 lg:z-auto">
      <div className="h-16 flex items-center px-4 border-b lg:hidden">Admin</div>
      <div className="hidden lg:block py-6" />
      <nav className="p-4 space-y-1">
        {items.map((it) => (
          <button
            key={it.key}
            onClick={() => onTabChange(it.key)}
            className={cn(
              'w-full text-left px-3 py-2 rounded-md transition-colors',
              activeTab === it.key ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'
            )}
          >
            {it.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
