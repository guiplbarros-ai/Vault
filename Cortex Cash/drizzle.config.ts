import type { Config } from 'drizzle-kit';

// NOTA: Este arquivo é código legado - o projeto usa Dexie.js agora
export default {
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'sqlite',
} satisfies Config;
