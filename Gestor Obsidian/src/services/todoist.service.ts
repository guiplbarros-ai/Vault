import { config } from 'dotenv';
import type { 
  TodoistTask, 
  TodoistProject, 
  CreateTaskOptions,
  TodoistLabel 
} from '../types/todoist.js';
import { logger } from '../utils/logger.js';

config();

const TODOIST_API_URL = 'https://api.todoist.com/rest/v2';

class TodoistService {
  private apiToken: string;

  constructor() {
    const token = process.env.TODOIST_API_TOKEN;
    
    if (!token) {
      throw new Error(
        'TODOIST_API_TOKEN não configurado. ' +
        'Adicione ao arquivo .env'
      );
    }

    this.apiToken = token;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${TODOIST_API_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Todoist API error: ${response.status} - ${error}`);
    }

    // Some endpoints return empty response
    const text = await response.text();
    return text ? JSON.parse(text) : (null as T);
  }

  /**
   * Lista todas as tarefas ativas
   */
  async getTasks(filter?: string): Promise<TodoistTask[]> {
    const params = filter ? `?filter=${encodeURIComponent(filter)}` : '';
    const tasks = await this.request<TodoistTask[]>(`/tasks${params}`);
    logger.info(`Todoist: ${tasks.length} tarefas carregadas`);
    return tasks;
  }

  /**
   * Busca uma tarefa por ID
   */
  async getTask(taskId: string): Promise<TodoistTask> {
    return this.request<TodoistTask>(`/tasks/${taskId}`);
  }

  /**
   * Cria uma nova tarefa
   */
  async createTask(options: CreateTaskOptions): Promise<TodoistTask> {
    const task = await this.request<TodoistTask>('/tasks', {
      method: 'POST',
      body: JSON.stringify(options),
    });
    
    logger.info(`Todoist: Tarefa criada - "${task.content}" (ID: ${task.id})`);
    return task;
  }

  /**
   * Atualiza uma tarefa existente
   */
  async updateTask(
    taskId: string, 
    updates: Partial<CreateTaskOptions>
  ): Promise<TodoistTask> {
    const task = await this.request<TodoistTask>(`/tasks/${taskId}`, {
      method: 'POST',
      body: JSON.stringify(updates),
    });
    
    logger.info(`Todoist: Tarefa atualizada - "${task.content}"`);
    return task;
  }

  /**
   * Marca uma tarefa como concluída
   */
  async completeTask(taskId: string): Promise<void> {
    await this.request(`/tasks/${taskId}/close`, {
      method: 'POST',
    });
    
    logger.info(`Todoist: Tarefa concluída (ID: ${taskId})`);
  }

  /**
   * Reabre uma tarefa concluída
   */
  async reopenTask(taskId: string): Promise<void> {
    await this.request(`/tasks/${taskId}/reopen`, {
      method: 'POST',
    });
    
    logger.info(`Todoist: Tarefa reaberta (ID: ${taskId})`);
  }

  /**
   * Deleta uma tarefa
   */
  async deleteTask(taskId: string): Promise<void> {
    await this.request(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
    
    logger.info(`Todoist: Tarefa deletada (ID: ${taskId})`);
  }

  /**
   * Lista todos os projetos
   */
  async getProjects(): Promise<TodoistProject[]> {
    return this.request<TodoistProject[]>('/projects');
  }

  /**
   * Busca projeto por nome
   */
  async findProjectByName(name: string): Promise<TodoistProject | null> {
    const projects = await this.getProjects();
    return projects.find(p => 
      p.name.toLowerCase().includes(name.toLowerCase())
    ) || null;
  }

  /**
   * Lista todas as labels
   */
  async getLabels(): Promise<TodoistLabel[]> {
    return this.request<TodoistLabel[]>('/labels');
  }

  /**
   * Formata tarefa para exibição
   */
  formatTask(task: TodoistTask): string {
    const priority = task.priority > 1 ? ` [P${5 - task.priority}]` : '';
    const due = task.due ? ` 📅 ${task.due.string}` : '';
    const labels = task.labels.length > 0 ? ` 🏷️ ${task.labels.join(', ')}` : '';
    
    return `• ${task.content}${priority}${due}${labels}`;
  }

  /**
   * Formata lista de tarefas para exibição
   */
  formatTaskList(tasks: TodoistTask[]): string {
    if (tasks.length === 0) {
      return 'Nenhuma tarefa encontrada.';
    }

    return tasks.map(t => this.formatTask(t)).join('\n');
  }
}

// Singleton
let todoistInstance: TodoistService | null = null;

export function getTodoistService(): TodoistService {
  if (!todoistInstance) {
    todoistInstance = new TodoistService();
  }
  return todoistInstance;
}

export { TodoistService };

