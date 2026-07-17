import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '../../../lib/firebaseAdmin';

export const runtime = 'nodejs';

// Verify the request is from an authenticated admin (check admin_session cookie)
function isAdminRequest(request: NextRequest): boolean {
  const session = request.cookies.get('admin_session');
  return !!session?.value;
}

// POST — Create a new staff member (salesman/admin)
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, email, password, role } = await request.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Name, email, password, and role are required' }, { status: 400 });
    }

    if (!['salesman', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Role must be salesman or admin' }, { status: 400 });
    }

    // Create Firebase Auth user
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    // Create Firestore user profile
    const profile = {
      uid: userRecord.uid,
      email,
      name,
      role,
      status: 'approved',
      plainPassword: password,
      createdAt: new Date().toISOString(),
      registrationCompleted: true,
    };

    await adminDb.collection('users').doc(userRecord.uid).set(profile);

    return NextResponse.json({ success: true, user: profile });
  } catch (error: any) {
    console.error('Error creating staff:', error);

    // Handle Firebase Auth specific errors
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }
    if (error.code === 'auth/invalid-email') {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }
    if (error.code === 'auth/weak-password') {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    return NextResponse.json({ error: error.message || 'Failed to create staff member' }, { status: 500 });
  }
}

// PUT — Update an existing staff member
export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { uid, name, email, password, role } = await request.json();

    if (!uid) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Update Firebase Auth user
    const authUpdate: any = {};
    if (name) authUpdate.displayName = name;
    if (email) authUpdate.email = email;
    if (password) authUpdate.password = password;

    if (Object.keys(authUpdate).length > 0) {
      await adminAuth.updateUser(uid, authUpdate);
    }

    // Update Firestore profile
    const profileUpdate: any = {};
    if (name) profileUpdate.name = name;
    if (email) profileUpdate.email = email;
    if (password) profileUpdate.plainPassword = password;
    if (role && ['salesman', 'admin', 'client'].includes(role)) profileUpdate.role = role;

    if (Object.keys(profileUpdate).length > 0) {
      await adminDb.collection('users').doc(uid).update(profileUpdate);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating staff:', error);

    if (error.code === 'auth/user-not-found') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json({ error: 'This email is already in use by another account' }, { status: 409 });
    }

    return NextResponse.json({ error: error.message || 'Failed to update staff member' }, { status: 500 });
  }
}

// DELETE — Delete a staff member
export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { uid } = await request.json();

    if (!uid) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Delete from Firebase Auth
    try {
      await adminAuth.deleteUser(uid);
    } catch (authErr: any) {
      // If user doesn't exist in Auth, continue to delete from Firestore
      if (authErr.code !== 'auth/user-not-found') {
        throw authErr;
      }
    }

    // Delete from Firestore
    await adminDb.collection('users').doc(uid).delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting staff:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete staff member' }, { status: 500 });
  }
}
