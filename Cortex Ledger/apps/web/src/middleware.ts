import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware para autenticação e proteção de rotas
 *
 * Rotas públicas: /login, /signup, /api/*, /_next/*
 * Rotas protegidas: Todas as outras rotas requerem autenticação
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Criar cliente Supabase
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Verificar sessão
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const pathname = request.nextUrl.pathname

  // Rotas públicas
  const publicRoutes = ['/login', '/signup']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Rotas de API e assets
  const isApiOrAsset = pathname.startsWith('/api') ||
                       pathname.startsWith('/_next') ||
                       pathname.startsWith('/favicon.ico')

  // Permitir acesso a rotas de API e assets sem autenticação
  if (isApiOrAsset) {
    return response
  }

  // Redirect para /login se não autenticado e tentando acessar rota protegida
  if (!session && !isPublicRoute) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect para / se autenticado e tentando acessar /login ou /signup
  if (session && isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
