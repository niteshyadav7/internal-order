import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('admin_session');

    if (session && session.value) {
      const adminEmail = session.value === 'authenticated'
        ? (process.env.ADMIN_EMAIL || 'admin@gmail.com')
        : session.value;
      return NextResponse.json({ success: true, authenticated: true, adminEmail });
    }

    return NextResponse.json({ success: true, authenticated: false });
  } catch (error) {
    console.error('Admin session check error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

