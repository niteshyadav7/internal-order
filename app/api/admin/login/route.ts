import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password, idToken } = await request.json();

    const expectedEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
    const expectedPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    let isAuthenticated = false;
    let authenticatedEmail = '';

    // 1. Verify via ID Token (if provided by client after successful Firebase Auth login)
    if (idToken && apiKey) {
      try {
        const lookupRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken })
          }
        );
        const lookupData = await lookupRes.json();
        if (lookupRes.ok && lookupData.users && lookupData.users.length > 0) {
          const verifiedEmail = lookupData.users[0].email;
          if (verifiedEmail && verifiedEmail.toLowerCase() === expectedEmail.toLowerCase()) {
            isAuthenticated = true;
            authenticatedEmail = verifiedEmail.toLowerCase();
          }
        }
      } catch (err) {
        console.error('Error verifying Firebase ID token on server:', err);
      }
    }

    // 2. Fallback to direct password check (original behavior)
    if (!isAuthenticated && email && password) {
      if (
        email.trim().toLowerCase() === expectedEmail.trim().toLowerCase() && 
        password === expectedPassword
      ) {
        isAuthenticated = true;
        authenticatedEmail = expectedEmail.trim().toLowerCase();
      } else {
        // Query Firestore users collection for custom Admin roles
        try {
          const { getAdminDb } = require('../../../lib/firebaseAdmin');
          const adminDb = getAdminDb();
          const usersRef = adminDb.collection('users');
          const snapshot = await usersRef.where('email', '==', email.trim()).get();
          
          if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            const userData = userDoc.data();
            
            if (userData.role === 'admin') {
              if (userData.status !== 'approved') {
                return NextResponse.json(
                  { success: false, error: 'Your admin account is pending approval or disabled' },
                  { status: 403 }
                );
              }
              if (userData.plainPassword === password) {
                isAuthenticated = true;
                authenticatedEmail = email.trim().toLowerCase();
              } else {
                return NextResponse.json(
                  { success: false, error: 'Invalid administrator password' },
                  { status: 401 }
                );
              }
            } else if (userData.role === 'salesman') {
              return NextResponse.json(
                { success: false, error: 'Access denied: Salesman accounts cannot login to the Admin Panel. Please use the Customer/Salesman Login page.' },
                { status: 403 }
              );
            } else {
              return NextResponse.json(
                { success: false, error: 'Access denied: Client accounts cannot login to the Admin Panel.' },
                { status: 403 }
              );
            }
          }
        } catch (dbErr) {
          console.error('Error verifying custom admin in Firestore:', dbErr);
        }
      }
    }

    if (isAuthenticated && authenticatedEmail) {
      const response = NextResponse.json({ success: true });
      
      // Set a secure, HTTP-only cookie for admin session containing the email
      response.cookies.set({
        name: 'admin_session',
        value: authenticatedEmail,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 // 1 day
      });

      return response;
    }

    return NextResponse.json(
      { success: false, error: 'Invalid administrator credentials or session mismatch' },
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
