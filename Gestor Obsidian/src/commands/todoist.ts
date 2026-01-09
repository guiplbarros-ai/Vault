import { Command } from 'commander';
import { getTodoistService } from '../services/todoist.service.js';
import { logger } from '../utils/logger.js';

export function createTodoistCommand(): Command {
  const todoist = new Command('todoist')
    .description('Gerencia tarefas no Todoist');

  // Listar tarefas
  todoist
    .command('list')
    .description('Lista tarefas pendentes')
    .option('-f, --filter <filter>', 'Filtro do Todoist (ex: "today", "p1", "@work")')
    .option('-p, --project <project>', 'Filtrar por nome do projeto')
    .action(async (options) => {
      try {
        const service = getTodoistService();
        
        let filter = options.filter;
        
        // Se especificou projeto, busca o ID
        if (options.project) {
          const project = await service.findProjectByName(options.project);
          if (project) {
            filter = filter 
              ? `${filter} & #${project.name}` 
              : `#${project.name}`;
          } else {
            console.log(`⚠️ Projeto "${options.project}" não encontrado`);
          }
        }

        const tasks = await service.getTasks(filter);
        
        console.log('\n📋 Tarefas Pendentes:\n');
        console.log(service.formatTaskList(tasks));
        console.log(`\nTotal: ${tasks.length} tarefa(s)`);
        
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        logger.error(message);
        console.error(`✗ Erro: ${message}`);
        process.exit(1);
      }
    });

  // Criar tarefa
  todoist
    .command('add')
    .description('Cria uma nova tarefa')
    .argument('<content>', 'Conteúdo da tarefa')
    .option('-d, --due <due>', 'Data de vencimento (ex: "today", "tomorrow", "next monday")')
    .option('-p, --priority <priority>', 'Prioridade (1-4, sendo 4 a mais alta)', '1')
    .option('-P, --project <project>', 'Nome do projeto')
    .option('--parent <taskId>', 'ID da tarefa pai (cria como subtask)')
    .option('-A, --assignee <nameOrEmail>', 'Responsável (nome ou email; requer --project)')
    .option('-l, --labels <labels>', 'Labels separadas por vírgula')
    .option('-D, --description <description>', 'Descrição da tarefa')
    .action(async (content, options) => {
      try {
        const service = getTodoistService();
        
        const taskOptions: Parameters<typeof service.createTask>[0] = {
          content,
          priority: parseInt(options.priority) as 1 | 2 | 3 | 4,
        };

        if (options.due) {
          taskOptions.due_string = options.due;
        }

        if (options.description) {
          taskOptions.description = options.description;
        }

        if (options.parent) {
          taskOptions.parent_id = options.parent;
        }

        if (options.labels) {
          taskOptions.labels = options.labels.split(',').map((l: string) => l.trim());
        }

        if (options.project) {
          const project = await service.findProjectByName(options.project);
          if (project) {
            taskOptions.project_id = project.id;

            if (options.assignee) {
              const collab = await service.findProjectCollaborator(project.id, options.assignee);
              if (!collab) {
                console.log(`⚠️ Responsável "${options.assignee}" não encontrado no projeto "${project.name}"`);
              } else {
                taskOptions.assignee_id = collab.id;
              }
            }
          } else {
            console.log(`⚠️ Projeto "${options.project}" não encontrado, criando na Inbox`);
          }
        } else if (options.assignee) {
          console.log('⚠️ Para usar --assignee, informe também --project');
        }

        const task = await service.createTask(taskOptions);
        
        console.log(`✓ Tarefa criada: "${task.content}"`);
        console.log(`  ID: ${task.id}`);
        console.log(`  URL: ${task.url}`);
        
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        logger.error(message);
        console.error(`✗ Erro: ${message}`);
        process.exit(1);
      }
    });

  // Listar colaboradores de um projeto
  todoist
    .command('collaborators')
    .description('Lista colaboradores de um projeto compartilhado')
    .option('-P, --project <project>', 'Nome do projeto')
    .action(async (options) => {
      try {
        const service = getTodoistService();

        if (!options.project) {
          console.log('⚠️ Informe --project "<nome>"');
          process.exit(1);
        }

        const project = await service.findProjectByName(options.project);
        if (!project) {
          console.log(`⚠️ Projeto "${options.project}" não encontrado`);
          process.exit(1);
        }

        const collabs = await service.getProjectCollaborators(project.id);
        console.log(`\n👥 Colaboradores (${project.name}):\n`);
        collabs.forEach(c => console.log(`• ${c.name} <${c.email}> - ID: ${c.id}`));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        logger.error(message);
        console.error(`✗ Erro: ${message}`);
        process.exit(1);
      }
    });

  // Completar tarefa
  todoist
    .command('complete')
    .description('Marca uma tarefa como concluída')
    .argument('<taskId>', 'ID da tarefa')
    .action(async (taskId) => {
      try {
        const service = getTodoistService();
        
        // Busca a tarefa para mostrar o nome
        const task = await service.getTask(taskId);
        await service.completeTask(taskId);
        
        console.log(`✓ Tarefa concluída: "${task.content}"`);
        
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        logger.error(message);
        console.error(`✗ Erro: ${message}`);
        process.exit(1);
      }
    });

  // Listar projetos
  todoist
    .command('projects')
    .description('Lista todos os projetos')
    .action(async () => {
      try {
        const service = getTodoistService();
        const projects = await service.getProjects();
        
        console.log('\n📁 Projetos:\n');
        projects.forEach(p => {
          const inbox = p.is_inbox_project ? ' (Inbox)' : '';
          const fav = p.is_favorite ? ' ⭐' : '';
          console.log(`• ${p.name}${inbox}${fav} - ID: ${p.id}`);
        });
        
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        logger.error(message);
        console.error(`✗ Erro: ${message}`);
        process.exit(1);
      }
    });

  // Tarefas de hoje
  todoist
    .command('today')
    .description('Lista tarefas para hoje')
    .action(async () => {
      try {
        const service = getTodoistService();
        const tasks = await service.getTasks('today | overdue');
        
        console.log('\n📅 Tarefas para Hoje:\n');
        console.log(service.formatTaskList(tasks));
        console.log(`\nTotal: ${tasks.length} tarefa(s)`);
        
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        logger.error(message);
        console.error(`✗ Erro: ${message}`);
        process.exit(1);
      }
    });

  return todoist;
}

