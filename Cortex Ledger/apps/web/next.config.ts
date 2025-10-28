import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Otimizações de performance
  reactStrictMode: true,

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Experimental features para melhor performance
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-avatar',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      'lucide-react',
      'date-fns',
    ],
  },

  // Configuração de imagens
  images: {
    formats: ['image/avif', 'image/webp'],
  },


  async redirects() {
    return [
      { source: '/home', destination: '/', permanent: false },
      { source: '/contas', destination: '/', permanent: false },
      { source: '/categorias', destination: '/', permanent: false },
      { source: '/orcamento', destination: '/', permanent: false },
      { source: '/regras', destination: '/', permanent: false },
      { source: '/relatorios', destination: '/', permanent: false },
      { source: '/transacoes', destination: '/', permanent: false },
      { source: '/transacoes-nova', destination: '/', permanent: false },
      { source: '/cartoes', destination: '/', permanent: false },
      { source: '/importar', destination: '/', permanent: false },
      { source: '/login', destination: '/', permanent: false },
      { source: '/signup', destination: '/', permanent: false }
    ];
  },
};

export default nextConfig;
