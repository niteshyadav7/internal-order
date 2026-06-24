import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const expectedEmail = process.env.ADMIN_EMAIL || 'admin@logistics.com';
    const expectedPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123';

    if (
      email && 
      password && 
      email.trim().toLowerCase() === expectedEmail.trim().toLowerCase() && 
      password === expectedPassword
    ) {
      const response = NextResponse.json({ success: true });
      
      // Set a secure, HTTP-only cookie for admin session
      response.cookies.set({
        name: 'admin_session',
        value: 'authenticated',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 // 1 day
      });

      return response;
    }

    return NextResponse.json(
      { success: false, error: 'Invalid administrator credentials' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
