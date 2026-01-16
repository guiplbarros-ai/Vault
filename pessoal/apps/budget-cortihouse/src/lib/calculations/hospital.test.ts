/**
 * Testes Unitários - Cálculos de Cortina Hospitalar
 */

import { describe, expect, it } from 'vitest'
import { HOSPITALAR } from '@/constants/calculation'
import {
  calculateHospitalCurtain,
  DEFAULT_HOSPITAL_PRICES,
  type HospitalCurtainInput,
  type HospitalPrices,
} from './hospital'

// Preços de teste para cálculos determinísticos
const TEST_PRICES: HospitalPrices = {
  hosp_vinil_m2: 100,
  hosp_tela_colmeia_m2: 80,
  hosp_trilho_luxo_m: 50,
  hosp_suporte_un: 15,
  hosp_tampas_par: 20,
  hosp_curva_un: 30,
  hosp_ilhos_un: 2,
  hosp_gancho_un: 3,
  hosp_deslizante_un: 4,
  hosp_confeccao_un: 150,
  hosp_instalacao_com_trilho_un: 200,
  hosp_instalacao_sem_trilho_un: 100,
  hosp_perfil_aluminio_m: 40,
  hosp_mao_obra_rebaixamento: 80,
}

describe('Cálculos de Cortina Hospitalar', () => {
  describe('calculateSupports (via calculateHospitalCurtain)', () => {
    it('deve retornar 2 suportes para trilhos até 1.5m', () => {
      const input: HospitalCurtainInput = {
        width: 1.5,
        ceilingHeight: 2.5,
        includeRail: true,
        includeInstallation: false,
        curves: 0,
        quantity: 1,
        prices: TEST_PRICES,
      }

      const result = calculateHospitalCurtain(input)

      expect(result.rail?.supports).toBe(2)
    })

    it('deve retornar 3 suportes para trilhos entre 1.5m e 3m', () => {
      const input: HospitalCurtainInput = {
        width: 2.5,
        ceilingHeight: 2.5,
        includeRail: true,
        includeInstallation: false,
        curves: 0,
        quantity: 1,
        prices: TEST_PRICES,
      }

      const result = calculateHospitalCurtain(input)

      expect(result.rail?.supports).toBe(3)
    })

    it('deve retornar ceil(comprimento) + 1 suportes para trilhos maiores que 3m', () => {
      const input: HospitalCurtainInput = {
        width: 4.5,
        ceilingHeight: 2.5,
        includeRail: true,
        includeInstallation: false,
        curves: 0,
        quantity: 1,
        prices: TEST_PRICES,
      }

      const result = calculateHospitalCurtain(input)

      expect(result.rail?.supports).toBe(6) // ceil(4.5) + 1 = 5 + 1 = 6
    })
  })

  describe('calculateHospitalCurtain', () => {
    describe('Cálculo de largura do tecido', () => {
      it('deve aplicar fator de franzido na largura', () => {
        const input: HospitalCurtainInput = {
          width: 2,
          ceilingHeight: 2.5,
          includeRail: false,
          includeInstallation: false,
          curves: 0,
          quantity: 1,
          prices: TEST_PRICES,
        }

        const result = calculateHospitalCurtain(input)

        expect(result.meta.fabricWidth).toBe(2 * HOSPITALAR.FATOR_FRANZIDO)
        expect(result.meta.fabricWidth).toBe(3.3) // 2 * 1.65 = 3.3
      })
    })

    describe('Determinação do tamanho da tela', () => {
      it('deve usar tela pequena para pé direito <= 2.6m', () => {
        const input: HospitalCurtainInput = {
          width: 2,
          ceilingHeight: 2.5,
          includeRail: false,
          includeInstallation: false,
          curves: 0,
          quantity: 1,
          prices: TEST_PRICES,
        }

        const result = calculateHospitalCurtain(input)

        expect(result.meta.meshSize).toBe('small')
        expect(result.materials.mesh.height).toBe(HOSPITALAR.ALTURA_TELA_PEQUENA)
        expect(result.materials.mesh.height).toBe(0.6)
      })

      it('deve usar tela grande para pé direito > 2.6m', () => {
        const input: HospitalCurtainInput = {
          width: 2,
          ceilingHeight: 2.8,
          includeRail: false,
          includeInstallation: false,
          curves: 0,
          quantity: 1,
          prices: TEST_PRICES,
        }

        const result = calculateHospitalCurtain(input)

        expect(result.meta.meshSize).toBe('large')
        expect(result.materials.mesh.height).toBe(HOSPITALAR.ALTURA_TELA_GRANDE)
        expect(result.materials.mesh.height).toBe(0.9)
      })

      it('deve usar tela pequena exatamente no limite de 2.6m', () => {
        const input: HospitalCurtainInput = {
          width: 2,
          ceilingHeight: 2.6,
          includeRail: false,
          includeInstallation: false,
          curves: 0,
          quantity: 1,
          prices: TEST_PRICES,
        }

        const result = calculateHospitalCurtain(input)

        expect(result.meta.meshSize).toBe('small')
      })
    })

    describe('Verificação de rebaixamento', () => {
      it('deve requerer rebaixamento para pé direito > 3.1m', () => {
        const input: HospitalCurtainInput = {
          width: 2,
          ceilingHeight: 3.5,
          includeRail: false,
          includeInstallation: false,
          curves: 0,
          quantity: 1,
          prices: TEST_PRICES,
        }

        const result = calculateHospitalCurtain(input)

        expect(result.meta.needsLowering).toBe(true)
        expect(result.lowering).toBeDefined()
        expect(result.lowering?.profileLength).toBe(2)
        expect(result.lowering?.laborCost).toBe(TEST_PRICES.hosp_mao_obra_rebaixamento)
      })

      it('não deve requerer rebaixamento para pé direito <= 3.1m', () => {
        const input: HospitalCurtainInput = {
          width: 2,
          ceilingHeight: 3.0,
          includeRail: false,
          includeInstallation: false,
          curves: 0,
          quantity: 1,
          prices: TEST_PRICES,
        }

        const result = calculateHospitalCurtain(input)

        expect(result.meta.needsLowering).toBe(false)
        expect(result.lowering).toBeUndefined()
      })

      it('não deve requerer rebaixamento exatamente no limite de 3.1m', () => {
        const input: HospitalCurtainInput = {
          width: 2,
          ceilingHeight: 3.1,
          includeRail: false,
          includeInstallation: false,
          curves: 0,
          quantity: 1,
          prices: TEST_PRICES,
        }

        const result = calculateHospitalCurtain(input)

        expect(result.meta.needsLowering).toBe(false)
      })
    })

    describe('Cálculo de materiais', () => {
      it('deve calcular área do vinil corretamente', () => {
        const input: HospitalCurtainInput = {
          width: 2,
          ceilingHeight: 2.5,
          includeRail: false,
          includeInstallation: false,
          curves: 0,
          quantity: 1,
          prices: TEST_PRICES,
        }

        const result = calculateHospitalCurtain(input)
        const expectedFabricWidth = 2 * HOSPITALAR.FATOR_FRANZIDO // 3.3
        const expectedArea = expectedFabricWidth * HOSPITALAR.ALTURA_VINIL // 3.3 * 2 = 6.6

        expect(result.materials.vinyl.width).toBe(expectedFabricWidth)
        expect(result.materials.vinyl.height).toBe(HOSPITALAR.ALTURA_VINIL)
        expect(result.materials.vinyl.area).toBe(expectedArea)
        expect(result.materials.vinyl.total).toBe(expectedArea * TEST_PRICES.hosp_vinil_m2)
      })

      it('deve calcular área da tela corretamente', () => {
        const input: HospitalCurtainInput = {
          width: 2,
          ceilingHeight: 2.5, // tela pequena
          includeRail: false,
          includeInstallation: false,
          curves: 0,
          quantity: 1,
          prices: TEST_PRICES,
        }

        const result = calculateHospitalCurtain(input)
        const expectedFabricWidth = 2 * HOSPITALAR.FATOR_FRANZIDO // 3.3
        const expectedArea = expectedFabricWidth * HOSPITALAR.ALTURA_TELA_PEQUENA // 3.3 * 0.6 = 1.98

        expect(result.materials.mesh.area).toBe(expectedArea)
        expect(result.materials.mesh.total).toBe(expectedArea * TEST_PRICES.hosp_tela_colmeia_m2)
      })

      it('deve calcular quantidade de acessórios baseado no espaçamento', () => {
        const input: HospitalCurtainInput = {
          width: 2, // fabricWidth = 3.3m
          ceilingHeight: 2.5,
          includeRail: false,
          includeInstallation: false,
          curves: 0,
          quantity: 1,
          prices: TEST_PRICES,
        }

        const result = calculateHospitalCurtain(input)
        const expectedFabricWidth = 2 * HOSPITALAR.FATOR_FRANZIDO // 3.3
        const expectedAccessories = Math.ceil(expectedFabricWidth / HOSPITALAR.ESPACAMENTO_GANCHO) // ceil(3.3/0.15) = 22

        expect(result.materials.hooks.quantity).toBe(expectedAccessories)
        expect(result.materials.grommets.quantity).toBe(expectedAccessories)
        expect(result.materials.sliders.quantity).toBe(expectedAccessories)
      })
    })

    describe('Cálculo de trilho', () => {
      it('não deve incluir trilho quando includeRail é false', () => {
        const input: HospitalCurtainInput = {
          width: 2,
          ceilingHeight: 2.5,
          includeRail: false,
          includeInstallation: false,
          curves: 0,
          quantity: 1,
          prices: TEST_PRICES,
        }

        const result = calculateHospitalCurtain(input)

        expect(result.rail).toBeUndefined()
        expect(result.summary.railTotal).toBe(0)
      })

      it('deve incluir trilho quando includeRail é true', () => {
        const input: HospitalCurtainInput = {
          width: 2,
          ceilingHeight: 2.5,
          includeRail: true,
          includeInstallation: false,
          curves: 0,
          quantity: 1,
          prices: TEST_PRICES,
        }

        const result = calculateHospitalCurtain(input)

        expect(result.rail).toBeDefined()
        expect(result.rail?.length).toBe(2)
        expect(result.rail?.caps).toBe(1)
      })

      it('deve calcular preço do trilho corretamente', () => {
        const input: HospitalCurtainInput = {
          width: 2,
          ceilingHeight: 2.5,
          includeRail: true,
          includeInstallation: false,
          curves: 2,
          quantity: 1,
          prices: TEST_PRICES,
        }

        const result = calculateHospitalCurtain(input)
        const supports = 3 // 2m = 3 suportes

        const expectedRailPrice = 2 * TEST_PRICES.hosp_trilho_luxo_m // 100
        const expectedSupportsPrice = supports * TEST_PRICES.hosp_suporte_un // 45
        const expectedCapsPrice = TEST_PRICES.hosp_tampas_par // 20
        const expectedCurvesPrice = 2 * TEST_PRICES.hosp_curva_un // 60
        const expectedTotal = expectedRailPrice + expectedSupportsPrice + expectedCapsPrice + expectedCurvesPrice // 225

        expect(result.rail?.prices.rail).toBe(expectedRailPrice)
        expect(result.rail?.prices.supports).toBe(expectedSupportsPrice)
        expect(result.rail?.prices.caps).toBe(expectedCapsPrice)
        expect(result.rail?.prices.curves).toBe(expectedCurvesPrice)
        expect(result.rail?.total).toBe(expectedTotal)
      })
    })

    describe('Cálculo de serviços', () => {
      it('deve sempre incluir confecção', () => {
        const input: HospitalCurtainInput = {
          width: 2,
          ceilingHeight: 2.5,
          includeRail: false,
          includeInstallation: false,
          curves: 0,
          quantity: 1,
          prices: TEST_PRICES,
        }

        const result = calculateHospitalCurtain(input)

        expect(result.services.manufacturing).toBeDefined()
        expect(result.services.manufacturing.total).toBe(TEST_PRICES.hosp_confeccao_un)
      })

      it('não deve incluir instalação quando includeInstallation é false', () => {
        const input: HospitalCurtainInput = {
          width: 2,
          ceilingHeight: 2.5,
          includeRail: false,
          includeInstallation: false,
          curves: 0,
          quantity: 1,
          prices: TEST_PRICES,
        }

        const result = calculateHospitalCurtain(input)

        expect(result.services.installation).toBeUndefined()
      })

      it('deve usar preço de instalação COM trilho quando includeRail é true', () => {
        const input: HospitalCurtainInput = {
          width: 2,
          ceilingHeight: 2.5,
          includeRail: true,
          includeInstallation: true,
          curves: 0,
          quantity: 1,
          prices: TEST_PRICES,
        }

        const result = calculateHospitalCurtain(input)

        expect(result.services.installation).toBeDefined()
        expect(result.services.installation?.unitPrice).toBe(TEST_PRICES.hosp_instalacao_com_trilho_un)
      })

      it('deve usar preço de instalação SEM trilho quando includeRail é false', () => {
        const input: HospitalCurtainInput = {
          width: 2,
          ceilingHeight: 2.5,
          includeRail: false,
          includeInstallation: true,
          curves: 0,
          quantity: 1,
          prices: TEST_PRICES,
        }

        const result = calculateHospitalCurtain(input)

        expect(result.services.installation).toBeDefined()
        expect(result.services.installation?.unitPrice).toBe(TEST_PRICES.hosp_instalacao_sem_trilho_un)
      })
    })

    describe('Cálculo de totais', () => {
      it('deve calcular total corretamente para quantidade = 1', () => {
        const input: HospitalCurtainInput = {
          width: 2,
          ceilingHeight: 2.5,
          includeRail: true,
          includeInstallation: true,
          curves: 0,
          quantity: 1,
          prices: TEST_PRICES,
        }

        const result = calculateHospitalCurtain(input)

        const expectedMaterialsTotal =
          result.materials.vinyl.total +
          result.materials.mesh.total +
          result.materials.hooks.total +
          result.materials.grommets.total +
          result.materials.sliders.total

        const expectedServicesTotal =
          result.services.manufacturing.total +
          (result.services.installation?.total ?? 0)

        const expectedSubtotal =
          expectedMaterialsTotal +
          (result.rail?.total ?? 0) +
          (result.lowering?.total ?? 0) +
          expectedServicesTotal

        expect(result.summary.materialsTotal).toBe(expectedMaterialsTotal)
        expect(result.summary.servicesTotal).toBe(expectedServicesTotal)
        expect(result.summary.subtotal).toBe(expectedSubtotal)
        expect(result.summary.total).toBe(expectedSubtotal)
      })

      it('deve multiplicar pelo quantity no total final', () => {
        const input: HospitalCurtainInput = {
          width: 2,
          ceilingHeight: 2.5,
          includeRail: false,
          includeInstallation: false,
          curves: 0,
          quantity: 3,
          prices: TEST_PRICES,
        }

        const result = calculateHospitalCurtain(input)

        expect(result.summary.quantity).toBe(3)
        expect(result.summary.total).toBe(result.summary.subtotal * 3)
      })
    })

    describe('Preços padrão', () => {
      it('deve usar preços padrão quando não fornecidos', () => {
        const input: HospitalCurtainInput = {
          width: 2,
          ceilingHeight: 2.5,
          includeRail: false,
          includeInstallation: false,
          curves: 0,
          quantity: 1,
          // sem prices
        }

        const result = calculateHospitalCurtain(input)

        expect(result.materials.vinyl.unitPrice).toBe(DEFAULT_HOSPITAL_PRICES.hosp_vinil_m2)
      })

      it('deve mesclar preços parciais com padrões', () => {
        const input: HospitalCurtainInput = {
          width: 2,
          ceilingHeight: 2.5,
          includeRail: false,
          includeInstallation: false,
          curves: 0,
          quantity: 1,
          prices: {
            hosp_vinil_m2: 150, // sobrescreve
            // outros usam padrão
          },
        }

        const result = calculateHospitalCurtain(input)

        expect(result.materials.vinyl.unitPrice).toBe(150)
        expect(result.materials.mesh.unitPrice).toBe(DEFAULT_HOSPITAL_PRICES.hosp_tela_colmeia_m2)
      })
    })

    describe('Cenários completos', () => {
      it('deve calcular orçamento completo com todos os recursos', () => {
        const input: HospitalCurtainInput = {
          width: 3,
          ceilingHeight: 3.5, // requer rebaixamento e tela grande
          includeRail: true,
          includeInstallation: true,
          curves: 2,
          quantity: 2,
          prices: TEST_PRICES,
        }

        const result = calculateHospitalCurtain(input)

        // Verificar que todos os componentes estão presentes
        expect(result.meta.meshSize).toBe('large')
        expect(result.meta.needsLowering).toBe(true)
        expect(result.rail).toBeDefined()
        expect(result.lowering).toBeDefined()
        expect(result.services.installation).toBeDefined()

        // Verificar que o total considera quantity
        expect(result.summary.quantity).toBe(2)
        expect(result.summary.total).toBe(result.summary.subtotal * 2)
      })

      it('deve calcular orçamento mínimo (sem trilho, sem instalação)', () => {
        const input: HospitalCurtainInput = {
          width: 1,
          ceilingHeight: 2.4,
          includeRail: false,
          includeInstallation: false,
          curves: 0,
          quantity: 1,
          prices: TEST_PRICES,
        }

        const result = calculateHospitalCurtain(input)

        expect(result.meta.meshSize).toBe('small')
        expect(result.meta.needsLowering).toBe(false)
        expect(result.rail).toBeUndefined()
        expect(result.lowering).toBeUndefined()
        expect(result.services.installation).toBeUndefined()
        expect(result.summary.railTotal).toBe(0)
        expect(result.summary.loweringTotal).toBe(0)
      })
    })
  })
})
