'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  PlusCircle, 
  Eye, 
  LogOut, 
  Menu,
  X,
  CheckSquare
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  const menuItems = [
    {
      id: 'submit',
      label: 'Submit Task',
      icon: PlusCircle,
      color: 'text-blue-600'
    },
    {
      id: 'view',
      label: 'View Tasks',
      icon: Eye,
      color: 'text-green-600'
    }
  ];

  const SidebarContent = () => (
    <>
      <div className="flex items-center space-x-2 p-6 border-b">
        <CheckSquare className="h-8 w-8 text-blue-600" />
        <h1 className="text-xl font-bold text-gray-900">Task Tracker</h1>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant={activeTab === item.id ? "default" : "ghost"}
            className={`w-full justify-start ${
              activeTab === item.id 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'hover:bg-gray-100'
            }`}
            onClick={() => {
              onTabChange(item.id);
              setIsOpen(false);
            }}
          >
            <item.icon className={`h-5 w-5 mr-3 ${
              activeTab === item.id ? 'text-white' : item.color
            }`} />
            {item.label}
          </Button>
        ))}
      </nav>

      <div className="p-4 border-t">
        <Button
          variant="outline"
          className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-white shadow-lg"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40 w-64 h-full
          flex flex-col bg-white border-r
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <SidebarContent />
      </aside>
    </>
  );
}