import { HOSPITALAR } from '@/constants/calculation'

/**
 * Preços hospitalares carregados do banco de dados
 */
export interface HospitalPrices {
  hosp_vinil_m2: number
  hosp_tela_colmeia_m2: number
  hosp_trilho_luxo_m: number
  hosp_suporte_un: number
  hosp_tampas_par: number
  hosp_curva_un: number
  hosp_ilhos_un: number
  hosp_gancho_un: number
  hosp_deslizante_un: number
  hosp_confeccao_un: number
  hosp_instalacao_com_trilho_un: number
  hosp_instalacao_sem_trilho_un: number
  hosp_perfil_aluminio_m: number
  hosp_mao_obra_rebaixamento: number
}

/**
 * Preços padrão (placeholders) - usado como fallback
 */
export const DEFAULT_HOSPITAL_PRICES: HospitalPrices = {
  hosp_vinil_m2: 0,
  hosp_tela_colmeia_m2: 0,
  hosp_trilho_luxo_m: 0,
  hosp_suporte_un: 0,
  hosp_tampas_par: 0,
  hosp_curva_un: 30,
  hosp_ilhos_un: 0,
  hosp_gancho_un: 0,
  hosp_deslizante_un: 0,
  hosp_confeccao_un: 0,
  hosp_instalacao_com_trilho_un: 0,
  hosp_instalacao_sem_trilho_un: 0,
  hosp_perfil_aluminio_m: 0,
  hosp_mao_obra_rebaixamento: 0,
}

/**
 * Interface de entrada para cálculo de cortina hospitalar
 */
export interface HospitalCurtainInput {
  /** Largura do vão em metros */
  width: number

  /** Pé direito em metros */
  ceilingHeight: number

  /** Incluir trilho no orçamento */
  includeRail: boolean

  /** Incluir instalação no orçamento */
  includeInstallation: boolean

  /** Quantidade de curvas no trilho */
  curves: number

  /** Quantidade de cortinas */
  quantity: number

  /** Preços carregados do banco de dados */
  prices?: Partial<HospitalPrices>
}

/**
 * Interface de saída com detalhes do cálculo
 */
export interface HospitalCurtainResult {
  /** Materiais calculados */
  materials: {
    vinyl: {
      width: number // Largura com franzido
      height: number // Altura fixa (2.00m)
      area: number // m² total
      unitPrice: number
      total: number
    }
    mesh: {
      width: number // Largura com franzido
      height: number // 0.60 ou 0.90
      area: number // m² total
      unitPrice: number
      total: number
    }
    hooks: {
      quantity: number
      unitPrice: number
      total: number
    }
    grommets: {
      quantity: number
      unitPrice: number
      total: number
    }
    sliders: {
      quantity: number
      unitPrice: number
      total: number
    }
  }

  /** Trilho (se incluído) */
  rail?: {
    length: number // metros
    supports: number
    caps: number // pares
    curves: number
    prices: {
      rail: number
      supports: number
      caps: number
      curves: number
    }
    total: number
  }

  /** Rebaixamento (se necessário) */
  lowering?: {
    profileLength: number
    laborCost: number
    total: number
  }

  /** Serviços */
  services: {
    manufacturing: {
      quantity: number
      unitPrice: number
      total: number
    }
    installation?: {
      quantity: number
      unitPrice: number
      total: number
    }
  }

  /** Resumo */
  summary: {
    materialsTotal: number
    railTotal: number
    loweringTotal: number
    servicesTotal: number
    subtotal: number
    quantity: number
    total: number
  }

  /** Metadados */
  meta: {
    meshSize: 'small' | 'large'
    needsLowering: boolean
    fabricWidth: number // Largura do tecido com franzido
  }
}

/**
 * Calcula a quantidade de suportes necessários para o trilho
 */
function calculateSupports(railLength: number): number {
  if (railLength <= 1.5) return 2
  if (railLength <= 3.0) return 3
  return Math.ceil(railLength) + 1
}

/**
 * Calcula orçamento de cortina hospitalar
 */
export function calculateHospitalCurtain(input: HospitalCurtainInput): HospitalCurtainResult {
  const { width, ceilingHeight, includeRail, includeInstallation, curves, quantity, prices } = input

  // Mesclar preços fornecidos com defaults
  const p: HospitalPrices = { ...DEFAULT_HOSPITAL_PRICES, ...prices }

  // 1. Calcular largura do tecido com franzido
  const fabricWidth = width * HOSPITALAR.FATOR_FRANZIDO

  // 2. Determinar altura da tela colméia
  const meshSize: 'small' | 'large' =
    ceilingHeight <= HOSPITALAR.LIMITE_PE_DIREITO_TELA ? 'small' : 'large'
  const meshHeight =
    meshSize === 'small' ? HOSPITALAR.ALTURA_TELA_PEQUENA : HOSPITALAR.ALTURA_TELA_GRANDE

  // 3. Verificar necessidade de rebaixamento
  const needsLowering = ceilingHeight > HOSPITALAR.LIMITE_PE_DIREITO_REBAIXAMENTO

  // 4. Calcular áreas
  const vinylArea = fabricWidth * HOSPITALAR.ALTURA_VINIL
  const meshArea = fabricWidth * meshHeight

  // 5. Calcular acessórios (baseado na largura com franzido)
  const accessoriesQuantity = Math.ceil(fabricWidth / HOSPITALAR.ESPACAMENTO_GANCHO)

  // 6. Calcular materiais
  const materials = {
    vinyl: {
      width: fabricWidth,
      height: HOSPITALAR.ALTURA_VINIL,
      area: vinylArea,
      unitPrice: p.hosp_vinil_m2,
      total: vinylArea * p.hosp_vinil_m2,
    },
    mesh: {
      width: fabricWidth,
      height: meshHeight,
      area: meshArea,
      unitPrice: p.hosp_tela_colmeia_m2,
      total: meshArea * p.hosp_tela_colmeia_m2,
    },
    hooks: {
      quantity: accessoriesQuantity,
      unitPrice: p.hosp_gancho_un,
      total: accessoriesQuantity * p.hosp_gancho_un,
    },
    grommets: {
      quantity: accessoriesQuantity,
      unitPrice: p.hosp_ilhos_un,
      total: accessoriesQuantity * p.hosp_ilhos_un,
    },
    sliders: {
      quantity: accessoriesQuantity,
      unitPrice: p.hosp_deslizante_un,
      total: accessoriesQuantity * p.hosp_deslizante_un,
    },
  }

  // 7. Calcular trilho (se incluído)
  let rail: HospitalCurtainResult['rail'] = undefined
  if (includeRail) {
    const supports = calculateSupports(width)
    rail = {
      length: width,
      supports,
      caps: 1, // 1 par
      curves,
      prices: {
        rail: width * p.hosp_trilho_luxo_m,
        supports: supports * p.hosp_suporte_un,
        caps: p.hosp_tampas_par,
        curves: curves * p.hosp_curva_un,
      },
      total:
        width * p.hosp_trilho_luxo_m +
        supports * p.hosp_suporte_un +
        p.hosp_tampas_par +
        curves * p.hosp_curva_un,
    }
  }

  // 8. Calcular rebaixamento (se necessário)
  let lowering: HospitalCurtainResult['lowering'] = undefined
  if (needsLowering) {
    lowering = {
      profileLength: width,
      laborCost: p.hosp_mao_obra_rebaixamento,
      total:
        width * p.hosp_perfil_aluminio_m + p.hosp_mao_obra_rebaixamento,
    }
  }

  // 9. Calcular serviços
  const services: HospitalCurtainResult['services'] = {
    manufacturing: {
      quantity: 1,
      unitPrice: p.hosp_confeccao_un,
      total: p.hosp_confeccao_un,
    },
  }

  if (includeInstallation) {
    const installationPrice = includeRail
      ? p.hosp_instalacao_com_trilho_un
      : p.hosp_instalacao_sem_trilho_un

    services.installation = {
      quantity: 1,
      unitPrice: installationPrice,
      total: installationPrice,
    }
  }

  // 10. Calcular totais
  const materialsTotal =
    materials.vinyl.total +
    materials.mesh.total +
    materials.hooks.total +
    materials.grommets.total +
    materials.sliders.total

  const railTotal = rail?.total ?? 0
  const loweringTotal = lowering?.total ?? 0
  const servicesTotal =
    services.manufacturing.total + (services.installation?.total ?? 0)

  const subtotalPerUnit = materialsTotal + railTotal + loweringTotal + servicesTotal
  const total = subtotalPerUnit * quantity

  return {
    materials,
    rail,
    lowering,
    services,
    summary: {
      materialsTotal,
      railTotal,
      loweringTotal,
      servicesTotal,
      subtotal: subtotalPerUnit,
      quantity,
      total,
    },
    meta: {
      meshSize,
      needsLowering,
      fabricWidth,
    },
  }
}
