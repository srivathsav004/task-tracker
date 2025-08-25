export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Task {
  id: number;
  user_id: number;
  date_raised?: string;
  client_name?: string;
  description?: string;
  customer_account_exec?: string;
  current_status: string;
  resolution_date?: string;
  deadline?: string;
  remarks?: string;
  user_name?: string;
}

export type TaskStatus = 'Open' | 'In-Progress' | 'Resolved' | 'Closed';