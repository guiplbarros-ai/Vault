/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },

  // ✅ Otimizações de performance
  reactStrictMode: true,

  // Otimizações de compilação
  experimental: {
    // Reduz o número de arquivos que o Turbopack monitora
    optimizePackageImports: ['recharts', 'lucide-react', 'date-fns'],
  },

  // Configuração vazia do Turbopack para silenciar warning
  turbopack: {},

  // Desabilita source maps em desenvolvimento para compilação mais rápida
  // (pode ser reativado se precisar debugar)
  productionBrowserSourceMaps: false,
}

export default nextConfig
