import type { AgentTool } from '../types.js';
import { getTodoistService } from '../../services/todoist.service.js';
import { getChatSettingsDbService } from '../../services/chat-settings-db.service.js';
import { getPeopleDbService } from '../../services/people-db.service.js';

async function getWorkspaceId(chatId: number): Promise<'pessoal' | 'freelaw'> {
  const chatDb = getChatSettingsDbService();
  if (!chatDb.enabled()) return 'pessoal';
  const s = await chatDb.getOrCreate(chatId);
  return (s.workspace_id as any) === 'freelaw' ? 'freelaw' : 'pessoal';
}

function isCasaContent(text: string): boolean {
  const t = text.toLowerCase();
  const keywords = ['casa', 'obra', 'reforma', 'mudança', 'mudanca', 'apartamento', 'condomínio', 'condominio', 'manutenção', 'manutencao'];
  return keywords.some(k => t.includes(k));
}

async function resolveDefaultProjectId(input: { workspaceId: 'pessoal' | 'freelaw'; content?: string }): Promise<string | null> {
  const todoist = getTodoistService();
  if (input.workspaceId === 'freelaw') {
    const p = await todoist.findProjectByName('Gestão Financeira - Freelaw');
    return p?.id || null;
  }
  const name = input.content && isCasaContent(input.content) ? 'Casinha :)' : 'Guilherme Barros';
  const p = await todoist.findProjectByName(name);
  return p?.id || null;
}

export function createCreateTaskTool(): AgentTool {
  return {
    name: 'CREATE_TASK',
    description: 'Cria uma tarefa no Todoist',
    async execute(params, ctx) {
      const todoist = getTodoistService();
      const workspaceId = await getWorkspaceId(ctx.chatId);
      const projectId = await resolveDefaultProjectId({ workspaceId, content: params.content });
      const task = await todoist.createTask({
        content: params.content,
        project_id: projectId || undefined,
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
      const workspaceId = await getWorkspaceId(ctx.chatId);
      const tasksAll = await todoist.getTasks(filter);

      // In freelaw context, default to the finance project to avoid leaking personal tasks.
      let tasks = tasksAll;
      if (workspaceId === 'freelaw') {
        const p = await todoist.findProjectByName('Gestão Financeira - Freelaw');
        if (p?.id) {
          tasks = tasksAll.filter(t => t.project_id === p.id);
        }
      }

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

export function createTodoistTasksForPersonTool(): AgentTool {
  return {
    name: 'TODOIST_TASKS_FOR_PERSON',
    description: 'Lista tarefas de uma pessoa (assignee) em um projeto/contexto (ação de consulta)',
    async execute(params, ctx) {
      const person = (params.person || params.name || params.email || '').trim();
      if (!person) return 'Parâmetro obrigatório: person (nome ou email)';

      const todoist = getTodoistService();
      const workspaceId = await getWorkspaceId(ctx.chatId);
      const filter = (params.filter || '').trim() || 'today | overdue';

      // Default project selection by context (freelaw -> finance project)
      const projectName = (params.project || '').trim() || (workspaceId === 'freelaw' ? 'Gestão Financeira - Freelaw' : '');
      if (!projectName) {
        return 'Para filtrar por pessoa, preciso do projeto. Envie project: <nome do projeto> (ou use no contexto freelaw).';
      }

      const project = await todoist.findProjectByName(projectName);
      if (!project?.id) return `Não encontrei o projeto "${projectName}" no Todoist.`;

      const all = await todoist.getTasks(filter);
      const inProject = all.filter(t => t.project_id === project.id);

      // Try by provided query; if not found and we are in freelaw, try CRM (Supabase people) to resolve email.
      let collaborator = await todoist.findProjectCollaborator(project.id, person);
      if (!collaborator && workspaceId === 'freelaw') {
        try {
          const peopleDb = getPeopleDbService();
          if (peopleDb.enabled()) {
            const p = await peopleDb.findByName('freelaw', person);
            const email = p?.notes?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || null;
            if (email) {
              collaborator = await todoist.findProjectCollaborator(project.id, email);
            }
          }
        } catch {
          // ignore CRM lookup
        }
      }
      if (!collaborator) {
        const collabs = await todoist.getProjectCollaborators(project.id);
        const list = collabs.slice(0, 15).map(c => `• ${c.name} (${c.email}) id=${c.id}`).join('\n') || '• (nenhum colaborador)';
        ctx.appendInternalData(`TODOIST_COLLABS("${projectName}")`, list);
        return `Não encontrei "${person}" entre os colaboradores do projeto "${projectName}".`;
      }

      const assigned = inProject.filter(t => (t.assignee_id || '') === collaborator.id);
      if (assigned.length === 0) return `Nenhuma tarefa encontrada para ${collaborator.name} no projeto "${projectName}" (${filter}).`;

      const list = assigned
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 12)
        .map((t, i) => {
          const p = t.priority > 1 ? ` [P${5 - t.priority}]` : '';
          const d = t.due?.string ? ` 📅${t.due.string}` : '';
          return `${i + 1}. ${t.content}${p}${d}\n  id: ${t.id}`;
        })
        .join('\n');
      ctx.appendInternalData(`TODOIST_TASKS_FOR_PERSON("${person}")`, list);
      return `Tarefas de ${collaborator.name} carregadas (${assigned.length})`;
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

export function createReopenTaskTool(): AgentTool {
  return {
    name: 'REOPEN_TASK',
    description: 'Reabre uma tarefa concluída no Todoist por id',
    async execute(params) {
      const todoist = getTodoistService();
      await todoist.reopenTask(params.id);
      return `Tarefa ${params.id} reaberta`;
    },
  };
}

export function createDeleteTaskTool(): AgentTool {
  return {
    name: 'DELETE_TASK',
    description: 'Deleta uma tarefa no Todoist por id',
    async execute(params) {
      const todoist = getTodoistService();
      await todoist.deleteTask(params.id);
      return `Tarefa ${params.id} deletada`;
    },
  };
}

export function createGetTaskTool(): AgentTool {
  return {
    name: 'GET_TASK',
    description: 'Busca uma tarefa no Todoist por id (salva detalhes no contexto interno)',
    async execute(params, ctx) {
      const todoist = getTodoistService();
      const task = await todoist.getTask(params.id);
      const content = [
        `id: ${task.id}`,
        `content: ${task.content}`,
        `project_id: ${task.project_id}`,
        `priority: ${task.priority}`,
        task.due?.string ? `due: ${task.due.string}` : '',
        task.labels?.length ? `labels: ${task.labels.join(', ')}` : '',
        task.url ? `url: ${task.url}` : '',
      ].filter(Boolean).join('\n');
      ctx.appendInternalData(`TODOIST_TASK(${task.id})`, content);
      return `Tarefa carregada`;
    },
  };
}

export function createListProjectsTool(): AgentTool {
  return {
    name: 'TODOIST_LIST_PROJECTS',
    description: 'Lista projetos do Todoist (salva amostra no contexto interno)',
    async execute(_params, ctx) {
      const todoist = getTodoistService();
      const projects = await todoist.getProjects();
      const list = projects
        .slice(0, 50)
        .map(p => `• ${p.name} (id: ${p.id})${p.is_inbox_project ? ' [inbox]' : ''}`)
        .join('\n');
      ctx.appendInternalData('TODOIST_PROJECTS', list);
      return `Projetos carregados (${projects.length})`;
    },
  };
}

export function createListLabelsTool(): AgentTool {
  return {
    name: 'TODOIST_LIST_LABELS',
    description: 'Lista labels do Todoist (salva amostra no contexto interno)',
    async execute(_params, ctx) {
      const todoist = getTodoistService();
      const labels = await todoist.getLabels();
      const list = labels.slice(0, 80).map(l => `• ${l.name} (id: ${l.id})`).join('\n') || '• (nenhuma label)';
      ctx.appendInternalData('TODOIST_LABELS', list);
      return `Labels carregadas (${labels.length})`;
    },
  };
}

export function createAddCommentTool(): AgentTool {
  return {
    name: 'TODOIST_ADD_COMMENT',
    description: 'Adiciona um comentário em uma tarefa do Todoist (ação mutável)',
    async execute(params) {
      const todoist = getTodoistService();
      const id = (params.id || '').trim();
      const content = (params.content || '').trim();
      if (!id) return 'Parâmetro obrigatório: id';
      if (!content) return 'Parâmetro obrigatório: content';
      const c = await todoist.addComment(id, content);
      return `Comentário adicionado (id: ${c.id})`;
    },
  };
}

export function createUpdateTaskTool(): AgentTool {
  return {
    name: 'TODOIST_UPDATE_TASK',
    description: 'Atualiza uma tarefa (content/due/priority/labels/project) (ação mutável)',
    async execute(params, ctx) {
      const todoist = getTodoistService();
      const id = (params.id || '').trim();
      if (!id) return 'Parâmetro obrigatório: id';

      const updates: any = {};
      if (params.content) updates.content = params.content;
      if (params.description) updates.description = params.description;
      if (params.due) updates.due_string = params.due;
      if (params.priority) updates.priority = parseInt(params.priority, 10) as 1 | 2 | 3 | 4;
      if (params.labels) {
        updates.labels = params.labels.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (params.project) {
        // accept project id or name
        const raw = params.project.trim();
        if (/^\d+$/.test(raw)) {
          updates.project_id = raw;
        } else {
          const p = await todoist.findProjectByName(raw);
          if (p?.id) updates.project_id = p.id;
        }
      } else {
        // If no explicit project is given, keep current routing behavior for new content changes
        const ws = await getWorkspaceId(ctx.chatId);
        const defaultPid = await resolveDefaultProjectId({ workspaceId: ws, content: params.content });
        if (defaultPid) updates.project_id = defaultPid;
      }

      const task = await todoist.updateTask(id, updates);
      return `Tarefa atualizada: "${task.content}"`;
    },
  };
}

