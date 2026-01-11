import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getTodoistService } from '../services/todoist.service.js';
import { loadEnv } from '../utils/env.js';

loadEnv();

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v : undefined;
}

function asNumber(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function asStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((x): x is string => typeof x === 'string').map(s => s.trim()).filter(Boolean);
  return out.length ? out : undefined;
}

function jsonText(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

async function main() {
  const server = new Server(
    { name: 'todoist-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'todoist_list_tasks',
          description:
            'Lista tarefas ativas. Por padrão, retorna apenas tarefas atribuídas a você ("assigned to: me"). Aceita filtro Todoist (ex: "today | overdue") e/ou nome de projeto.\n\nRoteamento (importante):\n- Freelaw/financeiro: projeto "Gestão financeira"\n- Pessoal: projetos "Casinha :)" (casa/obra/reforma) ou "Guilherme Barros" (geral)',
          inputSchema: {
            type: 'object',
            properties: {
              filter: { type: 'string', description: 'Filtro do Todoist (ex: "today", "p1", "@work")' },
              project: { type: 'string', description: 'Nome do projeto (busca aproximada)' },
              mine: {
                type: 'boolean',
                description: 'Se true, aplica "assigned to: me" (padrão: true). Use false para listar de todos.',
              },
            },
            additionalProperties: false,
          },
        },
        {
          name: 'todoist_get_task',
          description: 'Busca uma tarefa por ID.',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: { type: 'string' },
            },
            required: ['taskId'],
            additionalProperties: false,
          },
        },
        {
          name: 'todoist_add_task',
          description:
            'Cria uma tarefa no Todoist. Você pode informar due, prioridade (1-4), projeto, labels e descrição.\n\nRoteamento (importante):\n- Freelaw/financeiro: use project "Gestão financeira"\n- Pessoal: use project "Casinha :)" (casa/obra/reforma) ou "Guilherme Barros" (geral)',
          inputSchema: {
            type: 'object',
            properties: {
              content: { type: 'string', description: 'Conteúdo da tarefa' },
              due: { type: 'string', description: 'Data (ex: "today", "tomorrow", "next monday")' },
              priority: { type: 'number', description: 'Prioridade (1-4, sendo 4 a mais alta)' },
              project: { type: 'string', description: 'Nome do projeto (busca aproximada)' },
              parentId: { type: 'string', description: 'ID da tarefa pai (para criar como subtask)' },
              assignee: {
                type: 'string',
                description:
                  'Nome ou email do responsável (colaborador do projeto). Requer project ou projectId.',
              },
              projectId: { type: 'string', description: 'ID do projeto (alternativa a project)' },
              labels: {
                type: 'array',
                items: { type: 'string' },
                description: 'Lista de labels',
              },
              description: { type: 'string', description: 'Descrição da tarefa' },
            },
            required: ['content'],
            additionalProperties: false,
          },
        },
        {
          name: 'todoist_add_subtask',
          description:
            'Cria uma subtask (tarefa filha) no Todoist. Alias de todoist_add_task com parentId obrigatório.',
          inputSchema: {
            type: 'object',
            properties: {
              content: { type: 'string', description: 'Conteúdo da subtask' },
              parentId: { type: 'string', description: 'ID da tarefa pai' },
              due: { type: 'string', description: 'Data (ex: "today", "tomorrow", "next monday")' },
              priority: { type: 'number', description: 'Prioridade (1-4, sendo 4 a mais alta)' },
              project: { type: 'string', description: 'Nome do projeto (busca aproximada)' },
              projectId: { type: 'string', description: 'ID do projeto (alternativa a project)' },
              assignee: {
                type: 'string',
                description:
                  'Nome ou email do responsável (colaborador do projeto). Requer project ou projectId.',
              },
              labels: { type: 'array', items: { type: 'string' } },
              description: { type: 'string' },
            },
            required: ['content', 'parentId'],
            additionalProperties: false,
          },
        },
        {
          name: 'todoist_complete_task',
          description: 'Marca uma tarefa como concluída.',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: { type: 'string' },
            },
            required: ['taskId'],
            additionalProperties: false,
          },
        },
        {
          name: 'todoist_list_projects',
          description: 'Lista todos os projetos do Todoist.',
          inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        },
        {
          name: 'todoist_list_project_collaborators',
          description: 'Lista colaboradores de um projeto compartilhado.',
          inputSchema: {
            type: 'object',
            properties: {
              project: { type: 'string', description: 'Nome do projeto (busca aproximada)' },
              projectId: { type: 'string', description: 'ID do projeto (alternativa a project)' },
            },
            additionalProperties: false,
          },
        },
        {
          name: 'todoist_list_labels',
          description: 'Lista todas as labels do Todoist.',
          inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;

    const service = getTodoistService();

    switch (name) {
      case 'todoist_list_tasks': {
        let filter = asString(args.filter);
        const projectName = asString(args.project);
        const mine = typeof args.mine === 'boolean' ? args.mine : true;

        if (projectName) {
          const project = await service.findProjectByName(projectName);
          if (project) {
            filter = filter ? `${filter} & #${project.name}` : `#${project.name}`;
          }
        }

        if (mine) {
          filter = filter ? `assigned to: me & (${filter})` : 'assigned to: me';
        }

        const tasks = await service.getTasks(filter);
        return {
          content: [
            {
              type: 'text',
              text: [
                service.formatTaskList(tasks),
                '',
                `Total: ${tasks.length} tarefa(s)`,
                '',
                'Raw JSON:',
                jsonText(tasks),
              ].join('\n'),
            },
          ],
        };
      }

      case 'todoist_get_task': {
        const taskId = asString(args.taskId);
        if (!taskId) throw new Error('Parâmetro obrigatório: taskId');
        const task = await service.getTask(taskId);
        return {
          content: [
            { type: 'text', text: `${service.formatTask(task)}\n\nRaw JSON:\n${jsonText(task)}` },
          ],
        };
      }

      case 'todoist_add_task':
      case 'todoist_add_subtask': {
        const isSubtaskAlias = name === 'todoist_add_subtask';
        const content = asString(args.content);
        if (!content) throw new Error('Parâmetro obrigatório: content');

        const priorityRaw = asNumber(args.priority);
        const priority = (priorityRaw ?? 1);
        if (![1, 2, 3, 4].includes(priority)) {
          throw new Error('priority deve ser 1, 2, 3 ou 4');
        }

        const due = asString(args.due);
        const description = asString(args.description);
        const labels = asStringArray(args.labels);
        const projectName = asString(args.project);
        const projectIdArg = asString(args.projectId);
        const parentId = asString(args.parentId);
        const assignee = asString(args.assignee);

        if (isSubtaskAlias && !parentId) {
          throw new Error('Parâmetro obrigatório: parentId');
        }

        const taskOptions: Parameters<typeof service.createTask>[0] = {
          content,
          priority: priority as 1 | 2 | 3 | 4,
        };

        if (due) taskOptions.due_string = due;
        if (description) taskOptions.description = description;
        if (labels) taskOptions.labels = labels;
        if (parentId) taskOptions.parent_id = parentId;

        let resolvedProjectId: string | undefined;
        if (projectIdArg) {
          resolvedProjectId = projectIdArg;
        } else if (projectName) {
          const project = await service.findProjectByName(projectName);
          if (project) resolvedProjectId = project.id;
        }
        if (resolvedProjectId) {
          taskOptions.project_id = resolvedProjectId;
        }

        if (assignee) {
          if (!resolvedProjectId) {
            throw new Error('Para usar assignee, informe project ou projectId');
          }
          const collab = await service.findProjectCollaborator(resolvedProjectId, assignee);
          if (!collab) {
            throw new Error(`Colaborador não encontrado no projeto: ${assignee}`);
          }
          taskOptions.assignee_id = collab.id;
        }

        const task = await service.createTask(taskOptions);
        return {
          content: [
            {
              type: 'text',
              text: `✓ Tarefa criada: "${task.content}"\nID: ${task.id}\nURL: ${task.url}\n\nRaw JSON:\n${jsonText(task)}`,
            },
          ],
        };
      }

      case 'todoist_complete_task': {
        const taskId = asString(args.taskId);
        if (!taskId) throw new Error('Parâmetro obrigatório: taskId');
        const task = await service.getTask(taskId);
        await service.completeTask(taskId);
        return {
          content: [{ type: 'text', text: `✓ Tarefa concluída: "${task.content}" (ID: ${taskId})` }],
        };
      }

      case 'todoist_list_projects': {
        const projects = await service.getProjects();
        return {
          content: [
            {
              type: 'text',
              text: `Projetos (${projects.length}):\n\n${jsonText(projects)}`,
            },
          ],
        };
      }

      case 'todoist_list_project_collaborators': {
        const projectIdArg = asString(args.projectId);
        const projectName = asString(args.project);

        let projectId = projectIdArg;
        if (!projectId && projectName) {
          const project = await service.findProjectByName(projectName);
          if (project) projectId = project.id;
        }
        if (!projectId) throw new Error('Informe projectId ou project');

        const collabs = await service.getProjectCollaborators(projectId);
        return {
          content: [
            {
              type: 'text',
              text: `Colaboradores (${collabs.length}):\n\n${jsonText(collabs)}`,
            },
          ],
        };
      }

      case 'todoist_list_labels': {
        const labels = await service.getLabels();
        return {
          content: [
            {
              type: 'text',
              text: `Labels (${labels.length}):\n\n${jsonText(labels)}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Tool desconhecida: ${name}`);
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Mantém o processo vivo quando stdin está aberto (ex: Cursor).
  // Em alguns ambientes de execução, o stdin pode vir fechado e o processo encerra naturalmente.
  process.stdin.resume();
}

main().catch((err) => {
  // Importante: não logar segredos (token). Erros aqui não devem conter o token.
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`todoist-mcp error: ${message}\n`);
  process.exit(1);
});

