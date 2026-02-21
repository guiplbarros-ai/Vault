/**
 * Arredonda um valor para 2 casas decimais (centavos).
 * Usa Math.round para evitar erros de ponto flutuante em agregações financeiras.
 */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}
