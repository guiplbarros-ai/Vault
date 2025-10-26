#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pg from 'pg';

// Carregar variáveis de ambiente
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessários no arquivo .env');
}

// Criar cliente Supabase (REST)
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Conexão Postgres opcional (para DDL)
const DB_HOST = process.env.SUPABASE_DB_HOST;
const DB_PORT = process.env.SUPABASE_DB_PORT ? Number(process.env.SUPABASE_DB_PORT) : 5432;
const DB_NAME = process.env.SUPABASE_DB_NAME || 'postgres';
const DB_USER = process.env.SUPABASE_DB_USER || 'postgres';
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD; // necessário para DDL

const hasPg = Boolean(DB_HOST && DB_PASSWORD);
const Pool = pg.Pool;
const pool = hasPg
  ? new Pool({ host: DB_HOST, port: DB_PORT, database: DB_NAME, user: DB_USER, password: DB_PASSWORD, ssl: { rejectUnauthorized: false } })
  : null;

// Definir ferramentas disponíveis
const tools: Tool[] = [
  {
    name: 'supabase_query',
    description: 'Executa uma query SQL no Supabase usando RPC ou queries diretas',
    inputSchema: {
      type: 'object',
      properties: {
        table: { type: 'string', description: 'Nome da tabela para consultar' },
        select: { type: 'string', description: 'Colunas a selecionar (padrão: *)' },
        filters: { type: 'object', description: 'Filtros a aplicar' },
        limit: { type: 'number', description: 'Limite de registros' },
        order: { type: 'string', description: 'Ordenação (ex: "created_at.desc")' },
      },
      required: ['table'],
    },
  },
  { name: 'supabase_insert', description: 'Insere registros', inputSchema: { type: 'object', properties: { table: { type: 'string' }, data: { type: ['object', 'array'] } }, required: ['table', 'data'] } },
  { name: 'supabase_update', description: 'Atualiza registros', inputSchema: { type: 'object', properties: { table: { type: 'string' }, data: { type: 'object' }, filters: { type: 'object' } }, required: ['table', 'data', 'filters'] } },
  { name: 'supabase_delete', description: 'Deleta registros', inputSchema: { type: 'object', properties: { table: { type: 'string' }, filters: { type: 'object' } }, required: ['table', 'filters'] } },
  { name: 'supabase_list_tables', description: 'Lista tabelas do schema public', inputSchema: { type: 'object', properties: {} } },
  { name: 'supabase_get_schema', description: 'Obtém schema de uma tabela', inputSchema: { type: 'object', properties: { table: { type: 'string' } }, required: ['table'] } },
  {
    name: 'supabase_exec_sql_pg',
    description: 'Executa SQL arbitrário (DDL/DML) via conexão Postgres direta (requer SUPABASE_DB_* envs)',
    inputSchema: { type: 'object', properties: { sql: { type: 'string' } }, required: ['sql'] },
  },
  { name: 'supabase_rpc', description: 'Executa RPC', inputSchema: { type: 'object', properties: { function_name: { type: 'string' }, params: { type: 'object' } }, required: ['function_name'] } },
];

// Criar servidor MCP
const server = new Server(
  { name: 'mcp-supabase', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      case 'supabase_query': {
        const { table, select = '*', filters = {}, limit, order } = args as any;
        let query = supabase.from(table).select(select);
        for (const [k, v] of Object.entries(filters)) query = query.eq(k, v as any);
        if (order) { const [c, d] = (order as string).split('.'); query = query.order(c, { ascending: d !== 'desc' }); }
        if (limit) query = query.limit(limit as number);
        const { data, error } = await query;
        if (error) throw error;
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      case 'supabase_insert': {
        const { table, data } = args as any;
        const { data: result, error } = await supabase.from(table).insert(data).select();
        if (error) throw error; return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'supabase_update': {
        const { table, data, filters } = args as any;
        let q = supabase.from(table).update(data);
        for (const [k, v] of Object.entries(filters)) q = q.eq(k, v as any);
        const { data: result, error } = await q.select();
        if (error) throw error; return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'supabase_delete': {
        const { table, filters } = args as any;
        let q = supabase.from(table).delete();
        for (const [k, v] of Object.entries(filters)) q = q.eq(k, v as any);
        const { data: result, error } = await q.select();
        if (error) throw error; return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'supabase_list_tables': {
        if (!hasPg) throw new Error('Conexão PG não configurada (SUPABASE_DB_* envs).');
        const sql = `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name;`
        const { rows } = await pool!.query(sql);
        return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
      }
      case 'supabase_get_schema': {
        if (!hasPg) throw new Error('Conexão PG não configurada (SUPABASE_DB_* envs).');
        const { table } = args as any;
        const sql = `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='${table}' ORDER BY ordinal_position;`;
        const { rows } = await pool!.query(sql);
        return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
      }
      case 'supabase_exec_sql_pg': {
        if (!hasPg) throw new Error('Conexão PG não configurada (SUPABASE_DB_* envs).');
        const { sql } = args as any;
        const result = await pool!.query(sql);
        return { content: [{ type: 'text', text: JSON.stringify({ rowCount: result.rowCount }, null, 2) }] };
      }
      case 'supabase_rpc': {
        const { function_name, params = {} } = args as any;
        const { data, error } = await supabase.rpc(function_name, params);
        if (error) throw error; return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      default:
        throw new Error(`Ferramenta desconhecida: ${name}`);
    }
  } catch (error: any) {
    return { content: [{ type: 'text', text: `Erro: ${error.message}\n${error.details || ''}` }], isError: true };
  }
});

// Iniciar servidor
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Supabase Server rodando em stdio');
}

main().catch((error) => {
  console.error('Erro ao iniciar servidor:', error);
  process.exit(1);
});
