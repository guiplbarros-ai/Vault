import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────────────────────────────────────

interface ClassifyBatchRequest {
	limit?: number;
	dryRun?: boolean;
	useOpenAI?: boolean;
	filters?: {
		contaId?: string | null;
	};
}

interface ClassifyBatchResponse {
	processed: number;
	categorized: number;
	openaiCalls: number;
	errors: string[];
}

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

interface OpenAIResponse {
	categoria_id: string | null;
	tags: string[];
	score: number;
	reason: string;
	tokens_in: number;
	tokens_out: number;
	model: string;
	cost_usd: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize description for rule matching and deduplication
 * MUST match the client-side normalization in @cortex/services/normalization.ts
 * - Trims whitespace
 * - Converts to UPPERCASE (not lowercase!)
 * - Removes accents (NFD normalization)
 * - Collapses multiple spaces
 * - Removes special chars except *, -, /
 */
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

/**
 * Apply a single rule to a transaction description
 * Both normalizedDesc and expression are already UPPERCASE
 */
function matchRule(regra: Regra, normalizedDesc: string): boolean {
	const expr = regra.expressao.toUpperCase(); // Normalize expression to uppercase too

	switch (regra.tipo_regra) {
		case "regex": {
			try {
				const regex = new RegExp(expr, "i"); // Keep 'i' flag for safety
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

/**
 * Apply rules deterministically: first match by ordem wins; ties resolved by lower categoria_id
 */
function applyRules(
	tx: Transacao,
	regras: Regra[]
): ClassificationResult | null {
	const normalizedDesc = normalizeDescription(tx.descricao);

	const matches = regras.filter((r) => matchRule(r, normalizedDesc));

	if (matches.length === 0) return null;

	// Sort by ordem asc, then by categoria_id string asc for determinism
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

/**
 * Call OpenAI for classification fallback
 */
async function classifyWithOpenAI(
	tx: Transacao,
	openaiApiKey: string,
	model: string = "gpt-4o-mini",
	timeout: number = 20000
): Promise<OpenAIResponse | null> {
	const prompt = `You are a financial transaction classifier. Given the transaction description below, classify it into a category and suggest relevant tags.

Transaction:
- Description: "${tx.descricao}"
- Amount: ${tx.valor}
- Date: ${tx.data}

Respond ONLY with a valid JSON object (no markdown, no extra text):
{
  "categoria_id": "<UUID or null>",
  "tags": ["tag1", "tag2"],
  "score": <0.0-1.0>,
  "reason": "Brief explanation"
}

If you cannot confidently classify, return categoria_id as null and score < 0.7.`;

	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		const response = await fetch("https://api.openai.com/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${openaiApiKey}`,
			},
			body: JSON.stringify({
				model,
				messages: [{ role: "user", content: prompt }],
				temperature: 0.3,
				max_tokens: 200,
			}),
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			throw new Error(`OpenAI API error: ${response.status}`);
		}

		const data = await response.json();
		const content = data.choices?.[0]?.message?.content?.trim() || "{}";

		// Parse JSON response
		const parsed = JSON.parse(content);

		// Extract token usage and compute cost (rough estimate for gpt-4o-mini)
		const tokensIn = data.usage?.prompt_tokens || 0;
		const tokensOut = data.usage?.completion_tokens || 0;
		const costPerMillion = model.includes("gpt-4") ? 2.5 : 0.15; // rough estimates
		const costUsd = ((tokensIn + tokensOut) / 1_000_000) * costPerMillion;

		return {
			categoria_id: parsed.categoria_id || null,
			tags: parsed.tags || [],
			score: parsed.score || 0.5,
			reason: parsed.reason || "OpenAI classification",
			tokens_in: tokensIn,
			tokens_out: tokensOut,
			model: data.model || model,
			cost_usd: costUsd,
		};
	} catch (error) {
		console.error("OpenAI fallback error:", error);
		return null;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
	try {
		const supabaseUrl = Deno.env.get("SUPABASE_URL");
		const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
		const openaiApiKey = Deno.env.get("OPENAI_API_KEY") || "";
		const openaiModel = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
		const requestTimeout = parseInt(
			Deno.env.get("REQUEST_TIMEOUT_MS") || "20000",
			10
		);

		if (!supabaseUrl || !serviceRoleKey) {
			return new Response("Missing server configuration", { status: 500 });
		}

		const authHeader = req.headers.get("Authorization") ?? "";
		const supabase = createClient(supabaseUrl, serviceRoleKey, {
			global: { headers: { Authorization: authHeader } },
		});

		// Validate JWT and extract user
		const {
			data: { user },
			error,
		} = await supabase.auth.getUser();
		if (error || !user) {
			return new Response("Unauthorized", { status: 401 });
		}
		const userId = user.id;

		// Parse request body with validation
		const body = (await req.json().catch(() => ({}))) as ClassifyBatchRequest;

		// Validate and sanitize inputs
		const limit = Math.min(Math.max(body.limit ?? 500, 1), 5000);
		const dryRun = Boolean(body.dryRun ?? false);
		const useOpenAI = Boolean(body.useOpenAI ?? true);
		const contaFilter = body.filters?.contaId ?? null;

		// Validate contaFilter is a valid UUID if provided
		if (contaFilter && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contaFilter)) {
			return new Response(
				JSON.stringify({ error: "Invalid contaId format (must be UUID)" }),
				{
					headers: { "Content-Type": "application/json" },
					status: 400,
				}
			);
		}

		// ───────────────────────────────────────────────────────────────────────
		// 1) Fetch rules for this user (ordered by ordem asc)
		// ───────────────────────────────────────────────────────────────────────
		console.log(`[classify_batch] User ${userId}: fetching rules`);

		const { data: regras, error: regrasError } = await supabase
			.from("regra_classificacao")
			.select(
				"id, ordem, expressao, tipo_regra, categoria_id, tags, confianca_min"
			)
			.eq("user_id", userId)
			.order("ordem", { ascending: true });

		if (regrasError) {
			console.error(`[classify_batch] Failed to fetch rules for user ${userId}:`, regrasError);
			return new Response(
				JSON.stringify({ error: "Failed to fetch rules", details: regrasError.message }),
				{
					headers: { "Content-Type": "application/json" },
					status: 500,
				}
			);
		}

		console.log(`[classify_batch] Loaded ${regras?.length || 0} rules for user ${userId}`);

		const rules = (regras || []) as Regra[];

		// ───────────────────────────────────────────────────────────────────────
		// 2) Fetch uncategorized transactions for this user
		// ───────────────────────────────────────────────────────────────────────
		console.log(`[classify_batch] Fetching uncategorized transactions (limit: ${limit}, contaFilter: ${contaFilter || 'none'})`);

		let query = supabase
			.from("transacao")
			.select("id, descricao, valor, data, conta_id, categoria_id")
			.eq("user_id", userId)
			.is("categoria_id", null)
			.limit(limit);

		if (contaFilter) {
			query = query.eq("conta_id", contaFilter);
		}

		const { data: transacoes, error: txError } = await query;

		if (txError) {
			console.error(`[classify_batch] Failed to fetch transactions:`, txError);
			return new Response(
				JSON.stringify({ error: "Failed to fetch transactions", details: txError.message }),
				{
					headers: { "Content-Type": "application/json" },
					status: 500,
				}
			);
		}

		const txs = (transacoes || []) as Transacao[];
		console.log(`[classify_batch] Found ${txs.length} uncategorized transactions`);

		// ───────────────────────────────────────────────────────────────────────
		// 3) Process each transaction: apply rules first, then OpenAI fallback
		// ───────────────────────────────────────────────────────────────────────
		const results: {
			txId: string;
			result: ClassificationResult | null;
			aiResponse?: OpenAIResponse | null;
		}[] = [];
		const errors: string[] = [];
		let openaiCallCount = 0;

		for (const tx of txs) {
			try {
				// Try rules first
				const ruleResult = applyRules(tx, rules);

				if (ruleResult) {
					results.push({ txId: tx.id, result: ruleResult });
					continue;
				}

				// No rule match: fallback to OpenAI if enabled
				if (useOpenAI && openaiApiKey) {
					const aiResponse = await classifyWithOpenAI(
						tx,
						openaiApiKey,
						openaiModel,
						requestTimeout
					);

					if (aiResponse) {
						openaiCallCount++;
						const aiResult: ClassificationResult = {
							categoria_id: aiResponse.categoria_id,
							tags: aiResponse.tags,
							source: "openai",
							score: aiResponse.score,
							reason: aiResponse.reason,
						};
						results.push({ txId: tx.id, result: aiResult, aiResponse });
					} else {
						results.push({ txId: tx.id, result: null });
					}
				} else {
					results.push({ txId: tx.id, result: null });
				}
			} catch (err) {
				errors.push(`Transaction ${tx.id}: ${String(err)}`);
			}
		}

		// ───────────────────────────────────────────────────────────────────────
		// 4) Persist classifications (if not dryRun)
		// ───────────────────────────────────────────────────────────────────────
		let categorizedCount = 0;

		if (!dryRun) {
			for (const { txId, result, aiResponse } of results) {
				if (!result || !result.categoria_id) continue;

				// Update transaction with categoria_id
				const { error: updateError } = await supabase
					.from("transacao")
					.update({ categoria_id: result.categoria_id })
					.eq("id", txId)
					.eq("user_id", userId); // RLS enforcement

				if (updateError) {
					errors.push(`Failed to update tx ${txId}: ${updateError.message}`);
					continue;
				}

				categorizedCount++;

				// If OpenAI was used, log to log_ia
				if (result.source === "openai" && aiResponse) {
					const logEntry = {
						user_id: userId,
						ts: new Date().toISOString(),
						tarefa: "classify",
						modelo: aiResponse.model,
						tokens_in: aiResponse.tokens_in,
						tokens_out: aiResponse.tokens_out,
						custo_usd: aiResponse.cost_usd,
						score: aiResponse.score,
						detalhe: {
							transaction_id: txId,
							categoria_id: aiResponse.categoria_id,
							tags: aiResponse.tags,
							reason: aiResponse.reason,
						},
					};

					await supabase.from("log_ia").insert(logEntry);
				}
			}
		} else {
			// In dryRun, just count potential categorizations
			categorizedCount = results.filter(
				(r) => r.result && r.result.categoria_id
			).length;
		}

		// ───────────────────────────────────────────────────────────────────────
		// 5) Return summary
		// ───────────────────────────────────────────────────────────────────────
		const response: ClassifyBatchResponse = {
			processed: txs.length,
			categorized: categorizedCount,
			openaiCalls: openaiCallCount,
			errors,
		};

		console.log(`[classify_batch] Summary: processed=${txs.length}, categorized=${categorizedCount}, openaiCalls=${openaiCallCount}, errors=${errors.length}, dryRun=${dryRun}`);

		return new Response(JSON.stringify(response), {
			headers: { "Content-Type": "application/json" },
			status: 200,
		});
	} catch (e) {
		console.error("classify_batch error:", e);
		return new Response(
			JSON.stringify({ error: String(e), stack: e?.stack }),
			{
				headers: { "Content-Type": "application/json" },
				status: 500,
			}
		);
	}
});
