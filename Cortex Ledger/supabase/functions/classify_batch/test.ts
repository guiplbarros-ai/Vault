/**
 * Unit tests for classify_batch rule matching logic
 * Run with: deno test test.ts
 */

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Copy helper functions from index.ts for testing
// ─────────────────────────────────────────────────────────────────────────────

interface Regra {
	id: string;
	ordem: number;
	expressao: string;
	tipo_regra: "regex" | "contains" | "starts" | "ends";
	categoria_id: string | null;
	tags: string[] | null;
	confianca_min: number | null;
}

interface Transacao {
	id: string;
	descricao: string;
	valor: number;
	data: string;
	conta_id: string;
	categoria_id?: string | null;
}

interface ClassificationResult {
	categoria_id: string | null;
	tags: string[] | null;
	source: "rule" | "openai";
	score: number;
	reason: string;
}

function normalizeDescription(desc: string): string {
	if (!desc || typeof desc !== "string") return "";

	return desc
		.trim()
		.toUpperCase() // CRITICAL: Must be uppercase to match client hash computation
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "") // Remove accents
		.replace(/\s+/g, " ") // Collapse multiple spaces
		.replace(/[^\w\s\*\-\/]/g, " ") // Remove special chars except *, -, /
		.replace(/\s+/g, " ") // Collapse again after replacements
		.trim();
}

function matchRule(regra: Regra, normalizedDesc: string): boolean {
	const expr = regra.expressao.toUpperCase(); // Normalize expression to uppercase

	switch (regra.tipo_regra) {
		case "regex": {
			try {
				const regex = new RegExp(expr, "i");
				return regex.test(normalizedDesc);
			} catch {
				return false;
			}
		}
		case "contains":
			return normalizedDesc.includes(expr);
		case "starts":
			return normalizedDesc.startsWith(expr);
		case "ends":
			return normalizedDesc.endsWith(expr);
		default:
			return false;
	}
}

function applyRules(
	tx: Transacao,
	regras: Regra[]
): ClassificationResult | null {
	const normalizedDesc = normalizeDescription(tx.descricao);

	const matches = regras.filter((r) => matchRule(r, normalizedDesc));

	if (matches.length === 0) return null;

	matches.sort((a, b) => {
		if (a.ordem !== b.ordem) return a.ordem - b.ordem;
		const catA = a.categoria_id ?? "";
		const catB = b.categoria_id ?? "";
		return catA.localeCompare(catB);
	});

	const winner = matches[0];
	return {
		categoria_id: winner.categoria_id,
		tags: winner.tags,
		source: "rule",
		score: 1.0,
		reason: `Rule #${winner.ordem}: ${winner.tipo_regra}('${winner.expressao}')`,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("normalizeDescription: trims, uppercase, removes accents, collapses spaces", () => {
	assertEquals(
		normalizeDescription("  UBER   TRIP  HELP  "),
		"UBER TRIP HELP"
	);
	assertEquals(normalizeDescription("PIX\tENVIADO"), "PIX ENVIADO");
	assertEquals(
		normalizeDescription("Compra com cartão"),
		"COMPRA COM CARTAO" // accents removed
	);
});

Deno.test("matchRule: contains type", () => {
	const regra: Regra = {
		id: "1",
		ordem: 1,
		expressao: "uber", // Will be converted to UBER inside matchRule
		tipo_regra: "contains",
		categoria_id: "cat-transport",
		tags: ["ride"],
		confianca_min: null,
	};

	assertEquals(matchRule(regra, "UBER TRIP HELP"), true); // normalized desc is uppercase
	assertEquals(matchRule(regra, "IFOOD DELIVERY"), false);
});

Deno.test("matchRule: starts type", () => {
	const regra: Regra = {
		id: "2",
		ordem: 2,
		expressao: "ifood",
		tipo_regra: "starts",
		categoria_id: "cat-food",
		tags: ["delivery"],
		confianca_min: null,
	};

	assertEquals(matchRule(regra, "IFOOD MARKETPLACE"), true);
	assertEquals(matchRule(regra, "UBER IFOOD"), false);
});

Deno.test("matchRule: ends type", () => {
	const regra: Regra = {
		id: "3",
		ordem: 3,
		expressao: "br",
		tipo_regra: "ends",
		categoria_id: "cat-br",
		tags: [],
		confianca_min: null,
	};

	assertEquals(matchRule(regra, "UBER DO BRASIL BR"), true);
	assertEquals(matchRule(regra, "UBER BRASIL USA"), false);
});

Deno.test("matchRule: regex type", () => {
	const regra: Regra = {
		id: "4",
		ordem: 4,
		expressao: "^amazon\\s+marketplace",
		tipo_regra: "regex",
		categoria_id: "cat-shopping",
		tags: ["online"],
		confianca_min: null,
	};

	assertEquals(matchRule(regra, "AMAZON MARKETPLACE COMPRA"), true);
	assertEquals(matchRule(regra, "PRIME AMAZON MARKETPLACE"), false);
});

Deno.test("applyRules: first match by ordem wins", () => {
	const regras: Regra[] = [
		{
			id: "1",
			ordem: 2,
			expressao: "uber",
			tipo_regra: "contains",
			categoria_id: "cat-b",
			tags: [],
			confianca_min: null,
		},
		{
			id: "2",
			ordem: 1,
			expressao: "uber",
			tipo_regra: "contains",
			categoria_id: "cat-a",
			tags: [],
			confianca_min: null,
		},
	];

	const tx: Transacao = {
		id: "tx-1",
		descricao: "UBER TRIP",
		valor: -25.5,
		data: "2025-01-15",
		conta_id: "acc-1",
	};

	const result = applyRules(tx, regras);
	assertEquals(result?.categoria_id, "cat-a"); // ordem 1 wins
});

Deno.test("applyRules: ties resolved by categoria_id", () => {
	const regras: Regra[] = [
		{
			id: "1",
			ordem: 1,
			expressao: "uber",
			tipo_regra: "contains",
			categoria_id: "zzz-last",
			tags: [],
			confianca_min: null,
		},
		{
			id: "2",
			ordem: 1,
			expressao: "uber",
			tipo_regra: "contains",
			categoria_id: "aaa-first",
			tags: [],
			confianca_min: null,
		},
	];

	const tx: Transacao = {
		id: "tx-2",
		descricao: "UBER TRIP",
		valor: -30,
		data: "2025-01-15",
		conta_id: "acc-1",
	};

	const result = applyRules(tx, regras);
	assertEquals(result?.categoria_id, "aaa-first"); // lower string wins
});

Deno.test("applyRules: no match returns null", () => {
	const regras: Regra[] = [
		{
			id: "1",
			ordem: 1,
			expressao: "spotify",
			tipo_regra: "contains",
			categoria_id: "cat-music",
			tags: [],
			confianca_min: null,
		},
	];

	const tx: Transacao = {
		id: "tx-3",
		descricao: "NETFLIX SUBSCRIPTION",
		valor: -45.9,
		data: "2025-01-15",
		conta_id: "acc-1",
	};

	const result = applyRules(tx, regras);
	assertEquals(result, null);
});

Deno.test("applyRules: complex regex", () => {
	const regras: Regra[] = [
		{
			id: "1",
			ordem: 1,
			expressao: "pix\\s+(enviado|recebido)",
			tipo_regra: "regex",
			categoria_id: "cat-transfer",
			tags: ["pix"],
			confianca_min: null,
		},
	];

	const tx1: Transacao = {
		id: "tx-4",
		descricao: "PIX ENVIADO PARA JOAO",
		valor: -100,
		data: "2025-01-15",
		conta_id: "acc-1",
	};

	const tx2: Transacao = {
		id: "tx-5",
		descricao: "PIX RECEBIDO DE MARIA",
		valor: 200,
		data: "2025-01-15",
		conta_id: "acc-1",
	};

	const result1 = applyRules(tx1, regras);
	const result2 = applyRules(tx2, regras);

	assertEquals(result1?.categoria_id, "cat-transfer");
	assertEquals(result2?.categoria_id, "cat-transfer");
});
