import type { AgentTool } from '../types.js';
import { getTodoistService } from '../../services/todoist.service.js';

export function createCreateTaskTool(): AgentTool {
  return {
    name: 'CREATE_TASK',
    description: 'Cria uma tarefa no Todoist',
    async execute(params) {
      const todoist = getTodoistService();
      const task = await todoist.createTask({
        content: params.content,
        due_string: params.due,
        priority: params.priority ? (parseInt(params.priority, 10) as 1 | 2 | 3 | 4) : undefined,
      });
      return `Tarefa criada: "${task.content}"`;
    },
  };
}

export function createListTasksTool(): AgentTool {
  return {
    name: 'LIST_TASKS',
    description: 'Lista tarefas do Todoist (hoje/atrasadas por padrão)',
    async execute(params, ctx) {
      const todoist = getTodoistService();
      const filter = params.filter === 'all' ? undefined : 'today | overdue';
      const tasks = await todoist.getTasks(filter);

      if (tasks.length === 0) return 'Nenhuma tarefa encontrada';

      const list = tasks.slice(0, 10).map((t, i) => {
        const p = t.priority > 1 ? ` [P${5 - t.priority}]` : '';
        const d = t.due ? ` 📅${t.due.string}` : '';
        return `${i + 1}. ${t.content}${p}${d}`;
      }).join('\n');

      ctx.appendInternalData('TODOIST (amostra)', list);
      return `Tarefas carregadas (${tasks.length})`;
    },
  };
}

export function createCompleteTaskTool(): AgentTool {
  return {
    name: 'COMPLETE_TASK',
    description: 'Conclui uma tarefa no Todoist por id',
    async execute(params) {
      const todoist = getTodoistService();
      await todoist.completeTask(params.id);
      return `Tarefa ${params.id} concluída`;
    },
  };
}

