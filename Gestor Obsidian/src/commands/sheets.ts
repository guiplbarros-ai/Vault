import { Command } from 'commander';
import { logger } from '../utils/logger.js';
import { getGoogleAuthService } from '../services/google-auth.service.js';
import { getGoogleSheetsService } from '../services/google-sheets.service.js';
import { getNotionDbService } from '../services/notion-db.service.js';

function normalizeHeader(s: string): string {
  return s.trim();
}

function toNumberMaybe(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  // aceita "1.234,56" e "1234.56"
  const normalized = t.replace(/\./g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function buildNotionPropertiesFromRow(row: Record<string, string>): Record<string, unknown> {
  // Mapeamento por nome de coluna (Sheets header -> Notion property)
  // A ideia é o Sheets ser a "fonte da verdade".
  const props: Record<string, unknown> = {};

  const title = row['Item'] || row['item'] || row['Nome'] || row['name'] || '';
  if (title) {
    props.Item = { title: [{ text: { content: title } }] };
  }

  const tipo = row['Tipo'] || '';
  if (tipo) props.Tipo = { select: { name: tipo } };

  const status = row['Status'] || '';
  if (status) props.Status = { status: { name: status } };

  const forma = row['Forma de pagamento'] || row['Forma'] || '';
  if (forma) props['Forma de pagamento'] = { select: { name: forma } };

  const fornecedor = row['Fornecedor'] || '';
  if (fornecedor) props.Fornecedor = { rich_text: [{ text: { content: fornecedor } }] };

  const categoriaSelect = row['Categoria (select)'] || row['Categoria'] || '';
  if (categoriaSelect) props['Categoria (select)'] = { select: { name: categoriaSelect } };

  const categoriaText = row['Categoria (texto)'] || '';
  if (categoriaText) props.Categoria = { rich_text: [{ text: { content: categoriaText } }] };

  const obs = row['Observações'] || row['Obs'] || '';
  if (obs) props.Observações = { rich_text: [{ text: { content: obs } }] };

  const linkComp = row['Link/Comprovante'] || '';
  if (linkComp) props['Link/Comprovante'] = { url: linkComp };

  const valorEstimadoRaw = row['Valor estimado (R$)'] || row['Valor estimado'] || '';
  const valorEstimado = toNumberMaybe(valorEstimadoRaw);
  if (valorEstimado !== null) props['Valor estimado (R$)'] = { number: valorEstimado };

  const valorPagoRaw = row['Valor pago (R$)'] || row['Valor pago'] || '';
  const valorPago = toNumberMaybe(valorPagoRaw);
  if (valorPago !== null) props['Valor pago (R$)'] = { number: valorPago };

  const data = row['Data'] || '';
  if (data) props.Data = { date: { start: data } };

  // Campos de integração
  const idSheets = row['ID (Sheets)'] || row['ID'] || '';
  if (idSheets) props['ID (Sheets)'] = { rich_text: [{ text: { content: idSheets } }] };

  const linkSheets = row['Link (Sheets)'] || row['Link Sheets'] || '';
  if (linkSheets) props['Link (Sheets)'] = { url: linkSheets };

  props['Última atualização (Sheets)'] = { date: { start: new Date().toISOString() } };

  return props;
}

export function createSheetsCommand(): Command {
  const sheets = new Command('sheets')
    .description('Integrações com Google Sheets');

  sheets
    .command('sync-finance')
    .description('Sincroniza Google Sheets -> Notion (Controle Financeiro - Obra e Compras)')
    .option('--spreadsheet <id>', 'Spreadsheet ID (env: GOOGLE_SHEETS_FINANCE_SPREADSHEET_ID)')
    .option('--range <a1>', 'Range A1 (env: GOOGLE_SHEETS_FINANCE_RANGE)', 'Financeiro!A1:Z2000')
    .option('--notionDb <id>', 'Notion Database ID (env: NOTION_FINANCE_DATABASE_ID)')
    .option('--idColumn <name>', 'Nome da coluna ID no Sheets', 'ID (Sheets)')
    .option('--dry-run', 'Não escreve no Notion, só mostra o que faria', false)
    .action(async (opts) => {
      try {
        const auth = getGoogleAuthService();
        if (!auth.isAuthenticated()) {
          throw new Error('Não autenticado com Google. Execute: obsidian-manager google auth');
        }
        if (!auth.hasAllRequiredScopes()) {
          throw new Error(
            'Seu token do Google não tem escopos suficientes para acessar o Sheets.\n' +
            'Execute: npm run dev -- google auth --force\n' +
            '(se ainda falhar, execute antes: npm run dev -- google logout)'
          );
        }

        const spreadsheetId =
          opts.spreadsheet || process.env.GOOGLE_SHEETS_FINANCE_SPREADSHEET_ID;
        const rangeA1 = opts.range || process.env.GOOGLE_SHEETS_FINANCE_RANGE;
        const notionDb =
          opts.notionDb || process.env.NOTION_FINANCE_DATABASE_ID;

        if (!spreadsheetId) throw new Error('Spreadsheet ID ausente (flag --spreadsheet ou env GOOGLE_SHEETS_FINANCE_SPREADSHEET_ID)');
        if (!rangeA1) throw new Error('Range ausente (flag --range ou env GOOGLE_SHEETS_FINANCE_RANGE)');
        if (!opts.dryRun && !notionDb) {
          throw new Error('Notion DB ausente (flag --notionDb ou env NOTION_FINANCE_DATABASE_ID)');
        }

        const sheetsService = getGoogleSheetsService();
        const res = await sheetsService.getValues(spreadsheetId, rangeA1);
        const values = res.values || [];
        if (values.length < 2) {
          console.log('Nenhuma linha de dados encontrada (precisa header + ao menos 1 linha).');
          return;
        }

        const header = values[0].map((h) => normalizeHeader(String(h ?? '')));
        const rows = values.slice(1).filter((r) => r.some((c) => String(c ?? '').trim() !== ''));

        const idCol = opts.idColumn;
        const idIndex = header.findIndex((h) => h === idCol);
        if (idIndex === -1) {
          throw new Error(`Coluna de ID não encontrada no header: "${idCol}". Sugestão: crie uma coluna "ID (Sheets)" no Sheets.`);
        }

        const notion = opts.dryRun ? null : getNotionDbService();
        if (!opts.dryRun && !notion) {
          throw new Error('NOTION_API_KEY não configurado (necessário para escrever no Notion via CLI)');
        }

        let created = 0;
        let updated = 0;
        let skipped = 0;

        for (const r of rows) {
          const rowObj: Record<string, string> = {};
          for (let i = 0; i < header.length; i++) {
            const k = header[i];
            if (!k) continue;
            rowObj[k] = String(r[i] ?? '').trim();
          }

          const rowId = String(r[idIndex] ?? '').trim();
          if (!rowId) {
            skipped++;
            continue;
          }

          const props = buildNotionPropertiesFromRow(rowObj);

          if (opts.dryRun) {
            console.log(`[DRY] upsert ${rowId}: ${rowObj['Item'] || rowObj['Nome'] || '(sem item)'}`);
            continue;
          }

          const result = await notion!.upsertBySheetsId({
            databaseId: notionDb,
            sheetIdPropertyName: 'ID (Sheets)',
            sheetRowId: rowId,
            properties: props,
          });

          if (result === 'created') created++;
          else updated++;
        }

        console.log('\n✅ Sync concluído');
        console.log(`- Criados: ${created}`);
        console.log(`- Atualizados: ${updated}`);
        console.log(`- Ignorados (sem ID): ${skipped}`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(`Sheets sync-finance error: ${msg}`);
        console.error(`❌ ${msg}`);
        process.exit(1);
      }
    });

  return sheets;
}

