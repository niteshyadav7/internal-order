import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of allowed origins for CORS.
// Since the site changed its domain to balajitextiles.phyteam.com, we explicitly allow it.
const allowedOrigins = [
  'https://balajitextiles.phyteam.com',
  'http://localhost:3000',
  'http://localhost:3001',
];

const corsOptions = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
  'Access-Control-Allow-Credentials': 'true',
};

export function proxy(request: NextRequest) {
  // Check the origin from the request headers
  const origin = request.headers.get('origin') ?? '';
  
  // Allow if origin matches listed domains, or if it is any subdomain under phyteam.com
  const isAllowedOrigin = allowedOrigins.includes(origin) || origin.endsWith('.phyteam.com');

  // Handle CORS preflight (OPTIONS) requests
  const isPreflight = request.method === 'OPTIONS';

  if (isPreflight) {
    const preflightHeaders = {
      ...(isAllowedOrigin && { 'Access-Control-Allow-Origin': origin }),
      ...corsOptions,
    };
    return NextResponse.json({}, { headers: preflightHeaders });
  }

  // Handle standard request types
  const response = NextResponse.next();

  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  // Add the other CORS config headers to the response
  Object.entries(corsOptions).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// Restrict CORS middleware to api routes
export const config = {
  matcher: '/api/:path*',
};
