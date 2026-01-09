export interface TodoistTask {
  id: string;
  content: string;
  description: string;
  project_id: string;
  section_id: string | null;
  parent_id: string | null;
  assignee_id?: string | null;
  order: number;
  priority: 1 | 2 | 3 | 4; // 4 = urgent, 1 = normal
  due: TodoistDue | null;
  url: string;
  labels: string[];
  is_completed: boolean;
  created_at: string;
}

export interface TodoistDue {
  date: string;
  string: string;
  datetime: string | null;
  timezone: string | null;
  is_recurring: boolean;
}

export interface TodoistProject {
  id: string;
  name: string;
  color: string;
  order: number;
  is_favorite: boolean;
  is_inbox_project: boolean;
}

export interface CreateTaskOptions {
  content: string;
  description?: string;
  project_id?: string;
  section_id?: string;
  parent_id?: string;
  assignee_id?: string;
  due_string?: string;
  due_date?: string;
  priority?: 1 | 2 | 3 | 4;
  labels?: string[];
}

export interface TodoistLabel {
  id: string;
  name: string;
  color: string;
  order: number;
  is_favorite: boolean;
}

export interface TodoistCollaborator {
  id: string;
  name: string;
  email: string;
}
