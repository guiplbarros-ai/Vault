import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimit } from '@/lib/api/rate-limit'

// Rate limits per API path prefix (requests per minute)
const API_RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  '/api/ai/': { limit: 10, windowMs: 60_000 },
  '/api/import/': { limit: 5, windowMs: 60_000 },
  '/api/financeiro/': { limit: 30, windowMs: 60_000 },
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // ── Rate limiting for API routes ──────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const ip = getClientIp(request)
    for (const [prefix, config] of Object.entries(API_RATE_LIMITS)) {
      if (pathname.startsWith(prefix)) {
        const result = checkRateLimit(`${ip}:${prefix}`, config.limit, config.windowMs)
        if (!result.allowed) {
          return NextResponse.json(
            { error: 'Too many requests' },
            {
              status: 429,
              headers: {
                'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)),
                'X-RateLimit-Remaining': '0',
              },
            }
          )
        }
        break
      }
    }
  }

  // ── Supabase session refresh ──────────────────────────────────────
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'vault_one' },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Routes that don't require Supabase session auth
  // /api/financeiro/* uses its own Bearer token auth (validateApiKey)
  const publicPaths = ['/login', '/register', '/onboarding', '/api/financeiro']
  const isPublic = publicPaths.some(path => pathname.startsWith(path))

  if (!user && !isPublic) {
    // API routes: return 401 JSON (not redirect)
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Page routes: redirect to login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
