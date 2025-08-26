"use client";

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { CheckSquare, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminSidebarProps {
  activeTab: 'submit' | 'view' | 'manage' | 'logs';
  onTabChange: (tab: 'submit' | 'view' | 'manage' | 'logs') => void;
}

export default function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast({ title: 'Logged out' });
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast({ title: 'Logout failed', description: 'Please try again.', variant: 'destructive' });
    }
  };

  const items: { key: AdminSidebarProps['activeTab']; label: string }[] = [
    { key: 'submit', label: 'Submit Task' },
    { key: 'view', label: 'View Tasks' },
    { key: 'manage', label: 'Manage (Admin)' },
    { key: 'logs', label: 'Logs' },
  ];

  return (
    <aside className="w-64 shrink-0 border-r bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 fixed lg:static inset-x-0 top-0 lg:top-auto z-40 lg:z-auto h-full flex flex-col">
      {/* Header with logo */}
      <div className="h-16 flex items-center px-4 border-b bg-white">
        <CheckSquare className="h-6 w-6 text-blue-600 mr-2" />
        <div>
          <div className="text-sm font-semibold text-gray-900 leading-tight">Task Tracker</div>
          <div className="text-xs text-gray-500 -mt-0.5">Admin</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="p-4 space-y-1 flex-1 overflow-auto">
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

      {/* Footer Logout */}
      <div className="p-4 border-t bg-white">
        <Button
          variant="outline"
          className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
