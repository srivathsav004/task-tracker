'use client';

import { useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';
import TaskForm from '@/components/TaskForm';
import TasksTable from '@/components/TasksTable';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('submit');

  const renderContent = () => {
    switch (activeTab) {
      case 'submit':
        return <TaskForm />;
      case 'view':
        return <TasksTable />;
      default:
        return <TaskForm />;
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        {/* Mobile top header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b z-20 flex items-center px-4 text-sm font-semibold">Task Tracker</div>
        <main className="flex-1 p-4 lg:p-8 pt-20 lg:pt-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <header className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                {activeTab === 'submit' ? 'Create a new task and track its progress.' : 'Browse your tasks or view all tasks.'}
              </p>
            </header>

            {/* Mobile quick tabs */}
            <div className="lg:hidden flex gap-2">
              <Button
                variant={activeTab === 'submit' ? 'default' : 'outline'}
                className={activeTab === 'submit' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                onClick={() => setActiveTab('submit')}
              >
                Submit Task
              </Button>
              <Button
                variant={activeTab === 'view' ? 'default' : 'outline'}
                className={activeTab === 'view' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                onClick={() => setActiveTab('view')}
              >
                View Tasks
              </Button>
            </div>

            {renderContent()}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
