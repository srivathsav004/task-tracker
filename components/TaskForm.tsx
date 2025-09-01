'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TaskStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const statusOptions: TaskStatus[] = ['Open', 'In-Progress', 'Resolved', 'Closed'];
const execOptions: string[] = [
  'Hemanth Kumar Vankadara',
  'Sravani Konduru',
  'Priya Paul',
  'Nabila N',
  'A Kumar Rao',
  'Hema Akkipalli',
  'Kindigeri Sunanda',
  'P Reshama',
];

export default function TaskForm() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date_raised: '',
    client_name: '',
    description: '',
    customer_account_exec: '',
    current_status: '',
    resolution_date: '',
    deadline: '',
    remarks: '',
    source_of_query: '',
    other_source: ''
  });
  const [showOtherSource, setShowOtherSource] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare final form data
      const submitData = { ...formData };
      if (formData.source_of_query === 'others' && formData.other_source) {
        submitData.source_of_query = formData.other_source;
      }

      // Client-side validation: all fields required
      const requiredFields = [
        'date_raised',
        'client_name',
        'description',
        'customer_account_exec',
        'current_status',
        'resolution_date',
        'deadline',
        'remarks',
        'source_of_query'
      ] as const;
      const missing = requiredFields.filter((f) => !String((formData as any)[f] || '').trim());
      if (missing.length > 0) {
        toast({
          title: 'Please fill all fields',
          description: `Missing: ${missing.join(', ')}`,
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        toast({ title: 'Task created', description: 'Your task has been recorded.' });
        setFormData({
          date_raised: '',
          client_name: '',
          description: '',
          customer_account_exec: '',
          current_status: '',
          resolution_date: '',
          deadline: '',
          remarks: '',
          source_of_query: '',
          other_source: ''
        });
        setShowOtherSource(false);
      } else {
        const error = await response.json();
        toast({ title: 'Failed to create task', description: error.error || 'Please try again.', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Something went wrong', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (name: string, value: string) => {
    if (name === 'source_of_query') {
      setShowOtherSource(value === 'others');
      if (value !== 'others') {
        setFormData(prev => ({ ...prev, [name]: value, other_source: '' }));
        return;
      }
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>Submit New Task</span>
        </CardTitle>
        <CardDescription>
          Fill in the details to create a new task entry in the system.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="source_of_query">Source of Query *</Label>
              <Select
                value={formData.source_of_query}
                onValueChange={(value) => handleChange('source_of_query', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="mail">Mail</SelectItem>
                  <SelectItem value="verbal">Verbal Communication</SelectItem>
                  <SelectItem value="others">Others</SelectItem>
                </SelectContent>
              </Select>
              {showOtherSource && (
                <div className="mt-2">
                  <Input
                    id="other_source"
                    value={formData.other_source}
                    onChange={(e) => handleChange('other_source', e.target.value)}
                    placeholder="Please specify source"
                    disabled={loading}
                    required
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_raised">Date Raised *</Label>
              <Input
                id="date_raised"
                type="date"
                value={formData.date_raised}
                onChange={(e) => handleChange('date_raised', e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_name">Client Name *</Label>
              <Input
                id="client_name"
                value={formData.client_name}
                onChange={(e) => handleChange('client_name', e.target.value)}
                disabled={loading}
                placeholder="Enter client name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_account_exec">Customer Account Executive *</Label>
              <Select
                value={formData.customer_account_exec}
                onValueChange={(value) => handleChange('customer_account_exec', value)}
                required
              >
                <SelectTrigger id="customer_account_exec">
                  <SelectValue placeholder="Select executive" />
                </SelectTrigger>
                <SelectContent>
                  {execOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="current_status">Current Status *</Label>
              <Select
                value={formData.current_status}
                onValueChange={(value) => handleChange('current_status', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(status => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resolution_date">Resolution Date *</Label>
              <Input
                id="resolution_date"
                type="date"
                value={formData.resolution_date}
                onChange={(e) => handleChange('resolution_date', e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline *</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => handleChange('deadline', e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description of Query/Escalation *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={loading}
              placeholder="Enter detailed description of the query or escalation"
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Action Taken / Remarks *</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => handleChange('remarks', e.target.value)}
              disabled={loading}
              placeholder="Enter actions taken or additional remarks"
              rows={4}
              required
            />
          </div>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  date_raised: '',
                  client_name: '',
                  description: '',
                  customer_account_exec: '',
                  current_status: '',
                  resolution_date: '',
                  deadline: '',
                  remarks: '',
                  source_of_query: '',
                  other_source: ''
                });
                toast({ title: 'Form reset' });
              }}
            >
              Reset Form
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </span>
              ) : (
                'Create Task'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
