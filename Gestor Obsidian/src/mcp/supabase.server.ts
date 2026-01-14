import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Client } from 'pg';
import { loadEnv } from '../utils/env.js';

loadEnv();

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v : undefined;
}

async function withPg<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const url = (process.env.SUPABASE_DB_URL || '').trim();
  if (!url) {
    throw new Error('Defina SUPABASE_DB_URL (connection string do Postgres do Supabase)');
  }
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } as any });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  const server = new Server(
    { name: 'supabase-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'supabase_sql',
          description:
            'Executa SQL diretamente no Postgres do Supabase (perigoso). Use para migrações, correções e consultas. Requer SUPABASE_DB_URL no env.\n\nDica: prefira SELECTs e mudanças pequenas e versionadas.\n\nNÃO coloque secrets dentro do SQL.',
          inputSchema: {
            type: 'object',
            properties: {
              sql: { type: 'string', description: 'SQL para executar' },
              maxRows: { type: 'number', description: 'Máximo de linhas retornadas (default: 50)' },
            },
            required: ['sql'],
            additionalProperties: false,
          },
        },
        {
          name: 'supabase_tables',
          description: 'Lista tabelas do schema public (informação rápida).',
          inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;

    switch (name) {
      case 'supabase_tables': {
        const rows = await withPg(async (c) => {
          const r = await c.query(
            `select tablename from pg_tables where schemaname = 'public' order by tablename asc`
          );
          return r.rows;
        });
        const text = rows.map((r: { tablename: string }) => `- ${r.tablename}`).join('\n');
        return { content: [{ type: 'text', text: text || '(nenhuma)' }] };
      }

      case 'supabase_sql': {
        const sql = asString(args.sql);
        if (!sql) throw new Error('Parâmetro obrigatório: sql');
        const maxRows = typeof args.maxRows === 'number' && Number.isFinite(args.maxRows) ? Math.max(1, Math.min(500, args.maxRows)) : 50;

        const result = await withPg(async (c) => {
          return await c.query(sql);
        });

        const rows = Array.isArray(result.rows) ? result.rows.slice(0, maxRows) : [];
        const summary = `rows=${result.rowCount ?? rows.length}`;
        const json = JSON.stringify(rows, null, 2);
        return {
          content: [
            { type: 'text', text: `${summary}\n\n${json}` },
          ],
        };
      }

      default:
        throw new Error(`Tool desconhecida: ${name}`);
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stdin.resume();
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`supabase-mcp error: ${message}\n`);
  process.exit(1);
});

