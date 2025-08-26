'use client';

import { useEffect, useRef, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import TaskForm from '@/components/TaskForm';
import TasksTable from '@/components/TasksTable';
import AdminSidebar from '@/components/AdminSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'submit' | 'view' | 'manage' | 'logs'>('submit');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) return;
        const data = await res.json();
        setIsAdmin(data?.user?.email === 'hemanth.v@trst01.com');
      } catch {}
    };
    check();
  }, []);

  const LogsView = () => (
    <Card>
      <CardContent className="pt-6">
        <LogsTable />
      </CardContent>
    </Card>
  );

  return (
    <AuthGuard>
      {!isAdmin ? (
        <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground p-8">
          Admin access required.
        </div>
      ) : (
        <div className="min-h-screen bg-gray-50 flex">
          <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
          {/* Mobile top header */}
          <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b z-20 flex items-center px-4 text-sm font-semibold">Task Tracker · Admin</div>
          <main className="flex-1 p-4 lg:p-8 pt-20 lg:pt-8">
            <div className="max-w-7xl mx-auto space-y-6">
              {activeTab === 'submit' && <TaskForm />}
              {activeTab === 'view' && <TasksTable />}
              {activeTab === 'manage' && (
                <TasksTable adminMode showUpdatedAt />
              )}
              {activeTab === 'logs' && <LogsView />}
            </div>
          </main>
        </div>
      )}
    </AuthGuard>
  );
}

function LogsTable() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<string>('all');
  const [q, setQ] = useState<string>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [total, setTotal] = useState<number>(0);
  const { toast } = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type && type !== 'all') params.set('type', type);
      if (q) params.set('q', q);
      if (from) params.set('from', new Date(from).toISOString());
      if (to) params.set('to', new Date(to).toISOString());
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      const res = await fetch(`/api/logs/list?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load logs');
      const data = await res.json();
      setRows(data.logs || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      toast({ title: 'Failed to load logs', description: e?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, from, to, page, pageSize]);

  // Debounced dynamic search on q
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchLogs();
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const exportCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (type) params.set('type', type);
      if (q) params.set('q', q);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await fetch(`/api/logs/export?${params.toString()}`, {
        method: 'GET'
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition') || '';
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const filename = match?.[1] || 'logs_export.csv';
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export CSV error:', e);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-end bg-white p-3 rounded-md border">
        <div className="flex flex-col min-w-[180px]">
          <Label className="text-xs text-muted-foreground">Type</Label>
          <Select value={type} onValueChange={(v) => { setPage(1); setType(v); }}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="status_update">Status Update</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 flex flex-col">
          <Label className="text-xs text-muted-foreground">Search</Label>
          <Input
            className="h-9"
            placeholder="Task id, client, user, account exec..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="flex flex-col min-w-[180px]">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input type="date" className="h-9" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} />
        </div>

        <div className="flex flex-col min-w-[180px]">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input type="date" className="h-9" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} />
        </div>

        <div className="flex flex-col min-w-[120px]">
          <Label className="text-xs text-muted-foreground">Page size</Label>
          <Select value={String(pageSize)} onValueChange={(v) => { setPage(1); setPageSize(parseInt(v, 10)); }}>
            <SelectTrigger className="h-9 w-[110px]">
              <SelectValue placeholder="Rows" />
            </SelectTrigger>
            <SelectContent>
              {[10,20,30,50,100].map(n => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="icon" onClick={exportCsv} title="Download CSV">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => { setType('all'); setQ(''); setFrom(''); setTo(''); setPage(1); }}>Reset</Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b bg-white">
              <th className="p-3">Account Exec</th>
              <th className="p-3">Update</th>
              <th className="p-3">When (IST)</th>
              <th className="p-3">Client</th>
              <th className="p-3">Current Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-3" colSpan={5}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="p-3" colSpan={5}>No logs</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="border-b bg-white hover:bg-gray-50">
                  <td className="p-3">{r.customer_account_exec || '-'}</td>
                  <td className="p-3">{r.details}</td>
                  <td className="p-3 whitespace-nowrap">{new Date(r.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                  <td className="p-3">#{r.task_id} {r.client_name ? `· ${r.client_name}` : ''}</td>
                  <td className="p-3">{r.current_status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div>
          Page {page} of {totalPages} · {total} items
        </div>
        <div className="flex gap-2">
          <button
            className="h-9 px-3 border rounded-md disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <button
            className="h-9 px-3 border rounded-md disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
