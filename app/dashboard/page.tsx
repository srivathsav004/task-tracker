'use client';

import { useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';
import TaskForm from '@/components/TaskForm';
import TasksTable from '@/components/TasksTable';

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

        <main className="flex-1 p-4 lg:p-8 pt-20 lg:pt-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <header className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                {activeTab === 'submit' ? 'Create a new task and track its progress.' : 'Browse your tasks or view all tasks.'}
              </p>
            </header>

            {renderContent()}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}