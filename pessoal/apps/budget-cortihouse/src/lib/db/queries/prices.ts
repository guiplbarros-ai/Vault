import { eq, and } from 'drizzle-orm'
import { db } from '..'
import { materialPrices, type MaterialPrice, type NewMaterialPrice } from '../schema'

// Get all prices for a company
export async function getAllPrices(companyId: string): Promise<MaterialPrice[]> {
  return db.query.materialPrices.findMany({
    where: eq(materialPrices.companyId, companyId),
    orderBy: (prices, { asc }) => [asc(prices.category), asc(prices.name)],
  })
}

// Get prices as a key-value map for calculations
export async function getPricesMap(companyId: string): Promise<Record<string, number>> {
  const prices = await getAllPrices(companyId)
  return prices.reduce(
    (acc, price) => {
      acc[price.key] = Number(price.price)
      return acc
    },
    {} as Record<string, number>
  )
}

// Get a single price by key
export async function getPriceByKey(companyId: string, key: string): Promise<number> {
  const price = await db.query.materialPrices.findFirst({
    where: and(eq(materialPrices.companyId, companyId), eq(materialPrices.key, key)),
  })
  return price ? Number(price.price) : 0
}

// Update a price
export async function updatePrice(
  id: string,
  companyId: string,
  price: number
): Promise<MaterialPrice | null> {
  const [updated] = await db
    .update(materialPrices)
    .set({ price: price.toString(), updatedAt: new Date() })
    .where(and(eq(materialPrices.id, id), eq(materialPrices.companyId, companyId)))
    .returning()
  return updated ?? null
}

// Batch update prices
export async function updatePrices(
  companyId: string,
  updates: Array<{ id: string; price: number }>
): Promise<MaterialPrice[]> {
  const results: MaterialPrice[] = []
  for (const update of updates) {
    const updated = await updatePrice(update.id, companyId, update.price)
    if (updated) results.push(updated)
  }
  return results
}

// Seed initial prices for a company
export async function seedPrices(companyId: string): Promise<MaterialPrice[]> {
  // Check if prices already exist
  const existing = await getAllPrices(companyId)
  if (existing.length > 0) {
    return existing
  }

  const initialPrices: Omit<NewMaterialPrice, 'id' | 'createdAt' | 'updatedAt'>[] = [
    // Hospitalares - Materiais
    {
      companyId,
      key: 'hosp_vinil_m2',
      name: 'Vinil VNS 45',
      category: 'hospitalar_material',
      unit: 'm2',
      price: '0',
      description: 'Vinil hospitalar para cortinas',
    },
    {
      companyId,
      key: 'hosp_tela_colmeia_m2',
      name: 'Tela Colméia',
      category: 'hospitalar_material',
      unit: 'm2',
      price: '0',
      description: 'Tela colméia para parte superior',
    },
    {
      companyId,
      key: 'hosp_ilhos_un',
      name: 'Ilhós',
      category: 'hospitalar_material',
      unit: 'un',
      price: '0',
      description: 'Ilhós para fixação',
    },
    {
      companyId,
      key: 'hosp_gancho_un',
      name: 'Gancho',
      category: 'hospitalar_material',
      unit: 'un',
      price: '0',
      description: 'Gancho de fixação',
    },
    {
      companyId,
      key: 'hosp_deslizante_un',
      name: 'Deslizante',
      category: 'hospitalar_material',
      unit: 'un',
      price: '0',
      description: 'Deslizante para trilho',
    },

    // Hospitalares - Trilho
    {
      companyId,
      key: 'hosp_trilho_luxo_m',
      name: 'Trilho Luxo',
      category: 'hospitalar_trilho',
      unit: 'm',
      price: '0',
      description: 'Trilho luxo por metro',
    },
    {
      companyId,
      key: 'hosp_suporte_un',
      name: 'Suporte',
      category: 'hospitalar_trilho',
      unit: 'un',
      price: '0',
      description: 'Suporte para trilho',
    },
    {
      companyId,
      key: 'hosp_tampas_par',
      name: 'Tampas',
      category: 'hospitalar_trilho',
      unit: 'par',
      price: '0',
      description: 'Par de tampas para trilho',
    },
    {
      companyId,
      key: 'hosp_curva_un',
      name: 'Curva',
      category: 'hospitalar_trilho',
      unit: 'un',
      price: '30',
      description: 'Curva no trilho - R$30 confirmado',
    },

    // Hospitalares - Serviços
    {
      companyId,
      key: 'hosp_confeccao_un',
      name: 'Confecção',
      category: 'hospitalar_servico',
      unit: 'un',
      price: '0',
      description: 'Mão de obra de confecção por cortina',
    },
    {
      companyId,
      key: 'hosp_instalacao_com_trilho_un',
      name: 'Instalação c/ Trilho',
      category: 'hospitalar_servico',
      unit: 'un',
      price: '0',
      description: 'Instalação com trilho incluso',
    },
    {
      companyId,
      key: 'hosp_instalacao_sem_trilho_un',
      name: 'Instalação s/ Trilho',
      category: 'hospitalar_servico',
      unit: 'un',
      price: '0',
      description: 'Instalação sem trilho',
    },
    {
      companyId,
      key: 'hosp_perfil_aluminio_m',
      name: 'Perfil Alumínio',
      category: 'hospitalar_servico',
      unit: 'm',
      price: '0',
      description: 'Perfil de alumínio para rebaixamento',
    },
    {
      companyId,
      key: 'hosp_mao_obra_rebaixamento',
      name: 'M.O. Rebaixamento',
      category: 'hospitalar_servico',
      unit: 'un',
      price: '0',
      description: 'Mão de obra para rebaixamento',
    },

    // Fretes
    {
      companyId,
      key: 'frete_bh',
      name: 'Frete BH',
      category: 'frete',
      unit: 'un',
      price: '0',
      description: 'Frete para Belo Horizonte',
    },
    {
      companyId,
      key: 'frete_mg_interior',
      name: 'Frete MG Interior',
      category: 'frete',
      unit: 'un',
      price: '0',
      description: 'Frete para interior de Minas Gerais',
    },
    {
      companyId,
      key: 'frete_sp',
      name: 'Frete SP',
      category: 'frete',
      unit: 'un',
      price: '0',
      description: 'Frete para São Paulo',
    },
  ]

  const inserted = await db.insert(materialPrices).values(initialPrices).returning()
  return inserted
}

// Re-export labels from constants (for convenience)
export { categoryLabels, unitLabels } from '@/lib/constants/price-labels'
