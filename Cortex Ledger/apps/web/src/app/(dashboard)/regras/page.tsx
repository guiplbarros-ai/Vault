'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Plus, ArrowUp, ArrowDown, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Regra {
	id: string
	ordem: number
	expressao: string
	tipo_regra: 'regex' | 'contains' | 'starts' | 'ends'
	categoria_id: string | null
}

const TIPOS: Regra['tipo_regra'][] = ['regex', 'contains', 'starts', 'ends']

export default function RegrasPage() {
	const [regras, setRegras] = useState<Regra[]>([])
	const [loading, setLoading] = useState(false)
	const [creating, setCreating] = useState(false)
	const [newExpr, setNewExpr] = useState('')
	const [newTipo, setNewTipo] = useState<Regra['tipo_regra']>('contains')
	const [newCategoriaId, setNewCategoriaId] = useState<string>('')
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editExpr, setEditExpr] = useState('')
	const [editTipo, setEditTipo] = useState<Regra['tipo_regra']>('contains')
	const [editCategoriaId, setEditCategoriaId] = useState<string>('')

	useEffect(() => {
		load()
		async function load() {
			setLoading(true)
			const { data, error } = await supabase
				.from('regra_classificacao')
				.select('id, ordem, expressao, tipo_regra, categoria_id')
				.order('ordem', { ascending: true })
			if (!error && data) setRegras(data as Regra[])
			setLoading(false)
		}
	}, [])

	const nextOrder = useMemo(() => (regras.length ? Math.max(...regras.map(r => r.ordem)) + 1 : 1), [regras])

	async function createRule() {
		if (!newExpr.trim()) return
		const { data, error } = await supabase
			.from('regra_classificacao')
			.insert({ ordem: nextOrder, expressao: newExpr.trim(), tipo_regra: newTipo, categoria_id: newCategoriaId || null })
			.select('id, ordem, expressao, tipo_regra, categoria_id')
			.single()
		if (!error && data) {
			setRegras(prev => [...prev, data as Regra].sort((a,b)=>a.ordem-b.ordem))
			setCreating(false)
			setNewExpr(''); setNewCategoriaId(''); setNewTipo('contains')
		}
	}

	function startEdit(rule: Regra) {
		setEditingId(rule.id)
		setEditExpr(rule.expressao)
		setEditTipo(rule.tipo_regra)
		setEditCategoriaId(rule.categoria_id || '')
	}

	async function saveEdit(id: string) {
		const { data, error } = await supabase
			.from('regra_classificacao')
			.update({ expressao: editExpr.trim(), tipo_regra: editTipo, categoria_id: editCategoriaId || null })
			.eq('id', id)
			.select('id, ordem, expressao, tipo_regra, categoria_id')
			.single()
		if (!error && data) {
			setRegras(prev => prev.map(r => r.id === id ? data as Regra : r))
			setEditingId(null)
		}
	}

	async function deleteRule(id: string) {
		const { error } = await supabase.from('regra_classificacao').delete().eq('id', id)
		if (!error) setRegras(prev => prev.filter(r => r.id !== id))
	}

	async function move(id: string, direction: 'up' | 'down') {
		const idx = regras.findIndex(r => r.id === id)
		if (idx < 0) return
		const swapIdx = direction === 'up' ? idx - 1 : idx + 1
		if (swapIdx < 0 || swapIdx >= regras.length) return
		const a = regras[idx]
		const b = regras[swapIdx]
		// swap ordem values
		const updates = [
			supabase.from('regra_classificacao').update({ ordem: b.ordem }).eq('id', a.id),
			supabase.from('regra_classificacao').update({ ordem: a.ordem }).eq('id', b.id),
		]
		const res = await Promise.all(updates)
		if (res.every(r => !r.error)) {
			const newList = [...regras]
			newList[idx] = { ...a, ordem: b.ordem }
			newList[swapIdx] = { ...b, ordem: a.ordem }
			setRegras(newList.sort((x,y)=>x.ordem - y.ordem))
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Regras de Classificação</h1>
					<p className="text-neutral-500 mt-1">Defina regras na ordem aplicada; IA só entra se nenhuma regra casar.</p>
				</div>
				<Button onClick={() => setCreating(true)}>
					<Plus className="h-4 w-4 mr-2" />
					Nova Regra
				</Button>
			</div>

			{creating && (
				<Card>
					<CardHeader>
						<CardTitle>Nova Regra</CardTitle>
						<CardDescription>Preencha os campos e salve para adicionar a regra.</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
							<Input placeholder="expressão (ex: UBER)" value={newExpr} onChange={e=>setNewExpr(e.target.value)} />
							<Select value={newTipo} onChange={e=>setNewTipo(e.target.value as Regra['tipo_regra'])}>
								{TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
							</Select>
							<Input placeholder="categoria_id (opcional)" value={newCategoriaId} onChange={e=>setNewCategoriaId(e.target.value)} />
						</div>
						<div className="flex items-center gap-2 mt-4">
							<Button onClick={createRule}>Salvar</Button>
							<Button variant="outline" onClick={()=>{setCreating(false); setNewExpr('')}}>Cancelar</Button>
						</div>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Suas Regras</CardTitle>
					<CardDescription>Use as setas para reordenar. Primeiro match vence.</CardDescription>
				</CardHeader>
				<CardContent>
					{loading ? (
						<p className="text-neutral-500">Carregando…</p>
					) : regras.length === 0 ? (
						<p className="text-neutral-500">Nenhuma regra ainda. Clique em “Nova Regra”.</p>
					) : (
						<ul className="divide-y">
							{regras.map((r, idx) => (
								<li key={r.id} className="py-3 flex items-start justify-between gap-4">
									<div className="flex-1">
										{editingId === r.id ? (
											<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
												<Input value={editExpr} onChange={e=>setEditExpr(e.target.value)} />
												<Select value={editTipo} onChange={e=>setEditTipo(e.target.value as Regra['tipo_regra'])}>
													{TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
												</Select>
												<Input value={editCategoriaId} onChange={e=>setEditCategoriaId(e.target.value)} />
											</div>
										) : (
											<div>
												<p className="font-medium">[{r.ordem}] {r.tipo_regra} — {r.expressao}</p>
												<p className="text-sm text-neutral-500">Categoria: {r.categoria_id ?? '—'}</p>
											</div>
										)}
									</div>
									<div className="flex items-center gap-2">
										<Button variant="outline" size="sm" disabled={idx===0} onClick={()=>move(r.id,'up')} title="Mover para cima"><ArrowUp className="h-4 w-4" /></Button>
										<Button variant="outline" size="sm" disabled={idx===regras.length-1} onClick={()=>move(r.id,'down')} title="Mover para baixo"><ArrowDown className="h-4 w-4" /></Button>
										{editingId === r.id ? (
											<>
												<Button size="sm" onClick={()=>saveEdit(r.id)}>Salvar</Button>
												<Button size="sm" variant="outline" onClick={()=>setEditingId(null)}>Cancelar</Button>
											</>
										) : (
											<>
												<Button variant="outline" size="sm" onClick={()=>startEdit(r)}>Editar</Button>
												<Button variant="destructive" size="sm" onClick={()=>deleteRule(r.id)}><X className="h-4 w-4" /></Button>
											</>
										)}
									</div>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
