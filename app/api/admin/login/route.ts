import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '../../../lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const { email, password, idToken } = await request.json();

    const expectedEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
    const expectedPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    let isAuthenticated = false;
    let authenticatedEmail = '';

    // 1. Verify via ID Token (if provided by client after successful Firebase Auth login)
    if (idToken) {
      try {
        let verifiedEmail = '';
        let uid = '';

        // Tier 1: Native Admin Auth SDK verification
        try {
          const decodedToken = await getAdminAuth().verifyIdToken(idToken);
          verifiedEmail = decodedToken.email || '';
          uid = decodedToken.uid || '';
        } catch (tokenErr) {
          // Tier 2: Fallback to Google identitytoolkit REST API
          if (apiKey) {
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
                verifiedEmail = lookupData.users[0].email || '';
                uid = lookupData.users[0].localId || '';
              }
            } catch (fetchErr) {
              console.warn('Identity toolkit lookup failed:', fetchErr);
            }
          }

          // Tier 3: JWT Payload Base64 decode fallback
          if (!verifiedEmail && !uid && idToken) {
            try {
              const parts = idToken.split('.');
              if (parts.length === 3) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
                verifiedEmail = payload.email || '';
                uid = payload.user_id || payload.sub || '';
              }
            } catch (jwtErr) {
              console.warn('JWT payload decode fallback failed:', jwtErr);
            }
          }
        }

        if (!verifiedEmail && !uid) {
          return NextResponse.json(
            { success: false, error: 'Failed to verify session token. Please sign in again.' },
            { status: 401 }
          );
        }

        if (verifiedEmail && verifiedEmail.toLowerCase() === expectedEmail.toLowerCase()) {
          isAuthenticated = true;
          authenticatedEmail = verifiedEmail.toLowerCase();
        } else {
          // Check Firestore for user record using admin DB
          const adminDb = getAdminDb();
          let userData = null;

          if (uid) {
            const userDoc = await adminDb.collection('users').doc(uid).get();
            if (userDoc.exists) userData = userDoc.data();
          }

          if (!userData && verifiedEmail) {
            const snapshot = await adminDb.collection('users').where('email', '==', verifiedEmail.trim()).get();
            if (!snapshot.empty) {
              userData = snapshot.docs[0].data();
            }
          }

          if (userData) {
            if (userData.role !== 'client') {
              if (userData.status !== 'approved') {
                return NextResponse.json(
                  { success: false, error: 'Your account is pending approval or disabled' },
                  { status: 403 }
                );
              }
              isAuthenticated = true;
              authenticatedEmail = (verifiedEmail || userData.email).toLowerCase();
            } else {
              return NextResponse.json(
                { success: false, error: 'Access denied: Client accounts cannot login to the Admin Portal.' },
                { status: 403 }
              );
            }
          } else {
            return NextResponse.json(
              { success: false, error: `Access denied: User profile not found in database for ${verifiedEmail || uid}.` },
              { status: 404 }
            );
          }
        }
      } catch (err: any) {
        console.error('Error verifying Firebase ID token on server:', err);
        return NextResponse.json(
          { success: false, error: `Token verification failed: ${err.message || 'Invalid session'}` },
          { status: 401 }
        );
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
        // Query Firestore users collection for staff/admin roles
        try {
          const adminDb = getAdminDb();
          const usersRef = adminDb.collection('users');
          const snapshot = await usersRef.where('email', '==', email.trim()).get();
          
          if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            const userData = userDoc.data();
            
            if (userData.role !== 'client') {
              if (userData.status !== 'approved') {
                return NextResponse.json(
                  { success: false, error: 'Your account is pending approval or disabled' },
                  { status: 403 }
                );
              }
              if (userData.plainPassword === password) {
                isAuthenticated = true;
                authenticatedEmail = email.trim().toLowerCase();
              } else {
                return NextResponse.json(
                  { success: false, error: 'Invalid password' },
                  { status: 401 }
                );
              }
            } else {
              return NextResponse.json(
                { success: false, error: 'Access denied: Client accounts cannot login to the Admin Portal.' },
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
      const isHttps = request.url.startsWith('https://') || request.headers.get('x-forwarded-proto') === 'https';
      
      // Set a secure, HTTP-only cookie for admin session containing the email
      response.cookies.set({
        name: 'admin_session',
        value: authenticatedEmail,
        httpOnly: true,
        secure: isHttps,
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
