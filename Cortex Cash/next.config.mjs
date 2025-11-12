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

  // Configuração do Turbopack para ignorar arquivos temporários
  turbopack: {
    // Turbopack respeita .gitignore automaticamente
    // .DS_Store, .swp, etc. já estão no .gitignore
  },

  // Desabilita source maps em desenvolvimento para compilação mais rápida
  // (pode ser reativado se precisar debugar)
  productionBrowserSourceMaps: false,

  // Evita cache agressivo para o service worker e manifesto
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ]
  },
  
  // Corrige 404 do favicon redirecionando para o logo existente
  async redirects() {
    return [
      {
        source: '/favicon.ico',
        destination: '/logo.png',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
