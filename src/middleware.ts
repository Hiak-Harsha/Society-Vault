import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// ─── Constants ───────────────────────────────────────────────────────────────

const COOKIE_NAME = 'session-token';

const PUBLIC_ROUTES = [
  '/login',
  '/register-org',
  '/api/auth/login',
  '/api/auth/register-org',
];

// In-memory rate limiting map (IP -> { count, resetTime })
const ipLimits = new Map<string, { count: number; resetTime: number }>();

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
}

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public')
  );
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
}

// ─── Security Helpers ───────────────────────────────────────────────────────

function ipInCIDR(ip: string, cidr: string): boolean {
  try {
    const cleanIp = ip.trim();
    const cleanCidr = cidr.trim();
    
    if (!cleanCidr.includes('/')) {
      return cleanIp === cleanCidr;
    }
    
    const [range, bitsStr] = cleanCidr.split('/');
    const bits = parseInt(bitsStr, 10);
    
    if (cleanIp.includes('.') && range.includes('.')) {
      const ipParts = cleanIp.split('.').map(Number);
      const rangeParts = range.split('.').map(Number);
      
      if (ipParts.some(isNaN) || rangeParts.some(isNaN) || ipParts.length !== 4 || rangeParts.length !== 4) {
        return false;
      }
      
      const ipVal = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
      const rangeVal = (rangeParts[0] << 24) + (rangeParts[1] << 16) + (rangeParts[2] << 8) + rangeParts[3];
      
      const mask = bits === 0 ? 0 : ~((1 << (32 - bits)) - 1);
      
      return (ipVal & mask) === (rangeVal & mask);
    }
    
    return cleanIp === range;
  } catch {
    return false;
  }
}

function checkIpWhitelisted(ip: string, whitelistCsv: string): boolean {
  if (!whitelistCsv || whitelistCsv.trim() === '') return true;
  
  let clientIp = ip.trim();
  if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
    clientIp = '127.0.0.1';
  }
  
  const rules = whitelistCsv.split(',').map(s => s.trim()).filter(Boolean);
  
  for (const rule of rules) {
    if (rule === '127.0.0.1' && clientIp === '127.0.0.1') return true;
    if (ipInCIDR(clientIp, rule)) {
      return true;
    }
  }
  
  return false;
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Content-Security-Policy', 
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self';"
  );
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  return response;
}

// ─── Middleware ──────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets
  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  // 1. Rate Limiting for Login Route (5 requests/minute)
  if (pathname === '/api/auth/login' && request.method === 'POST') {
    const clientIp = (request as unknown as { ip?: string }).ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
    const cleanIp = clientIp.split(',')[0].trim();
    const now = Date.now();
    
    const limitInfo = ipLimits.get(cleanIp) || { count: 0, resetTime: now + 60000 };
    
    if (now > limitInfo.resetTime) {
      limitInfo.count = 1;
      limitInfo.resetTime = now + 60000;
    } else {
      limitInfo.count++;
    }
    
    ipLimits.set(cleanIp, limitInfo);
    
    if (limitInfo.count > 5) {
      const rateResponse = new NextResponse(
        JSON.stringify({ error: 'Too many login attempts. Please try again after 1 minute.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
      return applySecurityHeaders(rateResponse);
    }
  }

  // Allow public routes without authentication
  if (isPublicRoute(pathname)) {
    return applySecurityHeaders(NextResponse.next());
  }

  // Extract session token
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return redirectToLogin(request);
  }

  // Verify JWT
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);

    const userId = payload.userId as string | undefined;
    const role = payload.role as string | undefined;
    const orgId = payload.orgId as string | undefined;
    const email = payload.email as string | undefined;
    const name = payload.name as string | undefined;
    const ipWhitelist = payload.ipWhitelist as string | undefined;

    if (!userId || !role || !orgId || !email || !name) {
      return redirectToLogin(request);
    }

    // 2. Corporate IP Whitelisting Validation
    const clientIp = (request as unknown as { ip?: string }).ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
    const cleanIp = clientIp.split(',')[0].trim();

    if (ipWhitelist && !checkIpWhitelisted(cleanIp, ipWhitelist)) {
      if (pathname.startsWith('/api/')) {
        const errorResponse = new NextResponse(
          JSON.stringify({ error: 'Access denied: Client IP is not whitelisted by the organization.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
        return applySecurityHeaders(errorResponse);
      }
      
      // Return high-fidelity corporate glassmorphism access denied template
      const accessDeniedResponse = new NextResponse(
        `<html>
          <head>
            <title>Access Denied - SocietyVault</title>
            <style>
              body {
                background: radial-gradient(circle at center, #0f172a, #020617);
                color: #f1f5f9;
                font-family: 'Inter', -apple-system, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
              }
              .card {
                text-align: center;
                padding: 48px;
                background: rgba(15, 23, 42, 0.45);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 20px;
                backdrop-filter: blur(16px);
                box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
                max-width: 500px;
              }
              h1 {
                color: #f43f5e;
                margin-top: 0;
                font-size: 28px;
                letter-spacing: -0.025em;
              }
              p {
                color: #94a3b8;
                font-size: 15px;
                line-height: 1.6;
              }
              .ip-badge {
                display: inline-block;
                background: rgba(244, 63, 94, 0.15);
                color: #f43f5e;
                padding: 4px 12px;
                border-radius: 6px;
                font-family: monospace;
                font-weight: 600;
                margin: 8px 0;
              }
              a {
                display: inline-block;
                margin-top: 24px;
                padding: 12px 24px;
                background: linear-gradient(135deg, #10b981, #059669);
                color: #fff;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
                transition: transform 0.2s, box-shadow 0.2s;
              }
              a:hover {
                transform: translateY(-1px);
                box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
              }
            </style>
          </head>
          <body>
            <div class="card">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:20px;">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <h1>Access Denied</h1>
              <p>Your client IP address is not whitelisted by your organization:</p>
              <div class="ip-badge">${cleanIp}</div>
              <p style="margin-top: 12px;">Please connect to your corporate intranet, activate your company VPN, or contact your cooperative administrator.</p>
              <a href="/login">Return to Login</a>
            </div>
          </body>
        </html>`,
        { status: 403, headers: { 'Content-Type': 'text/html' } }
      );
      return applySecurityHeaders(accessDeniedResponse);
    }

    // ── Role-based route guards ──────────────────────────────────────────

    if (pathname.startsWith('/super-admin')) {
      if (role !== 'SUPER_ADMIN') {
        return applySecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)));
      }
    }

    if (pathname.startsWith('/admin')) {
      const allowedRoles = ['ADMIN', 'TREASURER', 'SUPER_ADMIN'];
      if (!allowedRoles.includes(role)) {
        return applySecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)));
      }
    }

    // ── Forward user info as headers for API routes ──────────────────────

    const response = NextResponse.next();
    response.headers.set('x-user-id', userId);
    response.headers.set('x-user-role', role);
    response.headers.set('x-user-org-id', orgId);
    response.headers.set('x-user-email', email);
    response.headers.set('x-user-name', name);

    return applySecurityHeaders(response);
  } catch {
    // Token verification failed — redirect to login
    return redirectToLogin(request);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
  const redirectResponse = NextResponse.redirect(loginUrl);
  return applySecurityHeaders(redirectResponse);
}

// ─── Config ─────────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (browser favicon)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
