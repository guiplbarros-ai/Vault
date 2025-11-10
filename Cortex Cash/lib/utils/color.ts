/**
 * Utilitários para manipulação de cores
 */

/**
 * Converte cor hexadecimal para RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Converte RGB para hexadecimal
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Clareia uma cor em um percentual
 * @param hex - Cor em hexadecimal (ex: "#3B82F6")
 * @param percent - Percentual para clarear (0-100). Default: 20%
 * @returns Cor clareada em hexadecimal
 */
export function lightenColor(hex: string, percent: number = 20): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex; // Se não conseguir converter, retorna a original

  // Clareia aumentando cada componente RGB em direção a 255
  const lighten = (value: number) => {
    return Math.min(255, value + ((255 - value) * percent) / 100);
  };

  return rgbToHex(
    lighten(rgb.r),
    lighten(rgb.g),
    lighten(rgb.b)
  );
}

/**
 * Escurece uma cor em um percentual
 * @param hex - Cor em hexadecimal (ex: "#3B82F6")
 * @param percent - Percentual para escurecer (0-100). Default: 20%
 * @returns Cor escurecida em hexadecimal
 */
export function darkenColor(hex: string, percent: number = 20): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  // Escurece diminuindo cada componente RGB em direção a 0
  const darken = (value: number) => {
    return Math.max(0, value - (value * percent) / 100);
  };

  return rgbToHex(
    darken(rgb.r),
    darken(rgb.g),
    darken(rgb.b)
  );
}
