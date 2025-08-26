'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Task, TaskStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Trash2 } from 'lucide-react';

interface TasksTableProps {
  adminMode?: boolean;
  showUpdatedAt?: boolean;
}

export default function TasksTable({ adminMode = false, showUpdatedAt = false }: TasksTableProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewAll, setViewAll] = useState(false);
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const statusOptions: TaskStatus[] = ['Open', 'In-Progress', 'Resolved', 'Closed'];

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks/list?all=${adminMode ? 'true' : String(viewAll)}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks);
      } else {
        toast({ title: 'Failed to fetch tasks', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Something went wrong', description: 'Unable to load tasks.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [viewAll, adminMode]);

  // reset to first page when filters/search change
  useEffect(() => {
    setPage(1);
  }, [search, status, viewAll]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-red-100 text-red-800';
      case 'In-Progress': return 'bg-yellow-100 text-yellow-800';
      case 'Resolved': return 'bg-green-100 text-green-800';
      case 'Closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const handleStatusChange = async (taskId: number, newStatus: TaskStatus) => {
    const prev = tasks;
    // optimistic update
    setTasks((ts) => ts.map(t => t.id === taskId ? { ...t, current_status: newStatus } : t));
    setUpdatingId(taskId);
    try {
      const res = await fetch('/api/tasks/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, current_status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update');
      }
      toast({ title: 'Status updated' });
    } catch (e: any) {
      // revert on failure
      setTasks(prev);
      toast({ title: 'Update failed', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (taskId: number) => {
    if (!adminMode) return;
    const prev = tasks;
    // optimistic remove
    setTasks((ts) => ts.filter(t => t.id !== taskId));
    try {
      const res = await fetch('/api/tasks/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete');
      }
      toast({ title: 'Task deleted' });
    } catch (e: any) {
      setTasks(prev);
      toast({ title: 'Delete failed', description: e?.message || 'Please try again.', variant: 'destructive' });
    }
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return tasks.filter(t => {
      const matchesStatus = status === 'all' ? true : t.current_status === status;
      const hay = `${t.client_name || ''} ${t.description || ''} ${t.customer_account_exec || ''} ${t.user_name || ''}`.toLowerCase();
      const matchesSearch = s ? hay.includes(s) : true;
      return matchesStatus && matchesSearch;
    });
  }, [tasks, search, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const csvEscape = (value: unknown) => {
    const s = value == null ? '' : String(value);
    if (/[",\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const handleExport = () => {
    try {
      const headers = [
        'Date Raised',
        'Client Name',
        'Description',
        'Account Exec',
        'Status',
        'Resolution Date',
        'Deadline',
        ...(adminMode || viewAll ? ['Created By'] : []),
        ...(showUpdatedAt ? ['Updated At'] : []),
      ];
      const rows = filtered.map(t => [
        formatDate(t.date_raised!),
        t.client_name ?? '',
        t.description ?? '',
        t.customer_account_exec ?? '',
        t.current_status ?? '',
        formatDate(t.resolution_date!),
        formatDate(t.deadline!),
        ...(adminMode || viewAll ? [t.user_name ?? ''] : []),
        ...(showUpdatedAt ? [formatDate(t.updated_at!)] : []),
      ]);
      const csv = [headers, ...rows]
        .map(r => r.map(csvEscape).join(','))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
      a.href = url;
      a.download = `${adminMode ? 'admin-tasks' : (viewAll ? 'all-tasks' : 'my-tasks')}-${ts}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Download started', description: 'Your CSV is being downloaded.' });
    } catch (e) {
      console.error('Export error', e);
      toast({ title: 'Export failed', description: 'Could not generate CSV.', variant: 'destructive' });
    }
  };

  return (
    <Card className="max-w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {adminMode ? 'All Tasks (Admin)' : (viewAll ? 'All Tasks' : 'My Tasks')}
            </CardTitle>
            <CardDescription>
              {adminMode ? 'Manage tasks from all users' : (viewAll ? 'View tasks from all users' : 'View your personal tasks')}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            {!adminMode && (
              <>
                <Button
                  variant={!viewAll ? "default" : "outline"}
                  onClick={() => setViewAll(false)}
                  className={!viewAll ? "bg-blue-600 hover:bg-blue-700" : ""}
                >
                  My Tasks
                </Button>
                <Button
                  variant={viewAll ? "default" : "outline"}
                  onClick={() => setViewAll(true)}
                  className={viewAll ? "bg-blue-600 hover:bg-blue-700" : ""}
                >
                  All Tasks
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={handleExport}
              title="Download CSV"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            placeholder="Search client, description, exec..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="In-Progress">In-Progress</SelectItem>
              <SelectItem value="Resolved">Resolved</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger>
              <SelectValue placeholder="Rows per page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date Raised</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Account Exec</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Resolution Date</TableHead>
                  <TableHead>Deadline</TableHead>
                  {(adminMode || viewAll) && <TableHead>Created By</TableHead>}
                  {showUpdatedAt && <TableHead>Updated At</TableHead>}
                  {adminMode && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-64" />
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    {(adminMode || viewAll) && <TableCell><Skeleton className="h-4 w-28" /></TableCell>}
                    {showUpdatedAt && <TableCell><Skeleton className="h-4 w-24" /></TableCell>}
                    {adminMode && <TableCell><Skeleton className="h-6 w-6" /></TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto max-w-md space-y-2">
              <h3 className="text-lg font-medium">No tasks yet</h3>
              <p className="text-sm text-muted-foreground">
                Create your first task to start tracking.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date Raised</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Account Exec</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Resolution Date</TableHead>
                  <TableHead>Deadline</TableHead>
                  {(adminMode || viewAll) && <TableHead>Created By</TableHead>}
                  {showUpdatedAt && <TableHead>Updated At</TableHead>}
                  {adminMode && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>{formatDate(task.date_raised!)}</TableCell>
                    <TableCell>{task.client_name || '-'}</TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={task.description || ''}>
                        {task.description || '-'}
                      </div>
                    </TableCell>
                    <TableCell>{task.customer_account_exec || '-'}</TableCell>
                    <TableCell>
                      {(!adminMode && viewAll) ? (
                        <Badge className={getStatusColor(task.current_status)}>
                          {task.current_status}
                        </Badge>
                      ) : (
                        <Select
                          value={task.current_status}
                          onValueChange={(v) => handleStatusChange(task.id, v as TaskStatus)}
                          disabled={updatingId === task.id}
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(task.resolution_date!)}</TableCell>
                    <TableCell>{formatDate(task.deadline!)}</TableCell>
                    {(adminMode || viewAll) && <TableCell>{task.user_name}</TableCell>}
                    {showUpdatedAt && <TableCell>{formatDate(task.updated_at!)}</TableCell>}
                    {adminMode && (
                      <TableCell>
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(task.id)}
                          title="Delete task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between py-4 text-sm text-muted-foreground">
              <div>
                Page {currentPage} of {totalPages} · Showing {paginated.length} of {filtered.length}
              </div>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
