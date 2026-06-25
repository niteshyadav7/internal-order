import { NextResponse } from 'next/server';
import { 
  db,
  createProduct, 
  getProducts, 
  getProfileFields, 
  getOrCreateUserProfile, 
  updateUserProfileStatus, 
  completeUserProfileRegistration,
  createOrder,
  getAllUserProfiles,
  Product
} from '@/app/lib/db';
import { FALLBACK_PRODUCTS } from '@/app/components/products/ProductCatalog';

export async function GET(request: Request) {
  try {
    if (!db) {
      return NextResponse.json({ 
        success: false, 
        error: 'Firestore is not initialized. Please ensure NEXT_PUBLIC_FIREBASE_API_KEY is configured in your .env.local file.' 
      }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const targetEmail = searchParams.get('email');
    const approveAll = searchParams.get('approve_all') !== 'false'; // default to true

    const log: string[] = [];

    // 1. Seed Profile Fields (if not already initialized)
    log.push('Checking profile fields...');
    const fields = await getProfileFields();
    log.push(`Profile fields loaded. Current count: ${fields.length}`);

    // 2. Seed Products (if not already present)
    log.push('Checking product catalog...');
    let products = await getProducts();
    if (products.length === 0) {
      log.push('No products found. Seeding default catalog...');
      const seedPromises = FALLBACK_PRODUCTS.map(async (p) => {
        const created = await createProduct({
          nameEn: p.nameEn,
          nameHi: p.nameHi,
          descEn: p.descEn,
          descHi: p.descHi,
          price: p.price,
          unit: p.unit,
          imageUrl: p.imageUrl,
          category: p.category
        });
        return created;
      });
      const seeded = await Promise.all(seedPromises);
      products = seeded.filter((p): p is Product => p !== null);
      log.push(`Seeded ${products.length} products.`);
    } else {
      log.push(`Products already present. Count: ${products.length}`);
    }

    // 3. Seed Default Admin/System User Profile
    log.push('Checking System Admin user profile...');
    const users = await getAllUserProfiles();
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@logistics.com';
    const existingAdmin = users.find(u => u.email.toLowerCase() === adminEmail.toLowerCase());

    if (!existingAdmin) {
      log.push('System Admin profile not found. Seeding System Admin profile...');
      const adminUid = 'system-admin-seed-uid';
      await getOrCreateUserProfile(adminUid, adminEmail, 'System Admin');
      await updateUserProfileStatus(adminUid, 'approved');
      await completeUserProfileRegistration(adminUid, { 'Firm Name': 'Elegance Logistics Headquarters' }, 'System Admin');
      log.push('System Admin profile created and approved.');
    } else {
      log.push('System Admin profile already exists.');
    }

    // 4. Seed Dummy Order (if none exist)
    log.push('Checking orders...');
    const allUsers = await getAllUserProfiles();
    if (products.length > 0) {
      const sampleProduct = products[0];
      const targetUser = allUsers.find(u => u.status === 'approved') || allUsers[0];
      
      if (targetUser) {
        // Create a dummy order
        const dummyOrder = {
          userUid: targetUser.uid,
          userName: targetUser.name,
          userEmail: targetUser.email,
          items: [
            {
              productId: sampleProduct.id || 'retail-1',
              nameEn: sampleProduct.nameEn,
              nameHi: sampleProduct.nameHi,
              price: sampleProduct.price,
              unit: sampleProduct.unit,
              quantity: 2
            }
          ]
        };
        const createdOrder = await createOrder(dummyOrder);
        if (createdOrder) {
          log.push(`Created a sample order (ID: ${createdOrder.id}) for user ${targetUser.email}.`);
        }
      }
    }

    // 5. Approve users
    let approvedCount = 0;
    if (targetEmail) {
      log.push(`Searching for user with email "${targetEmail}" to approve...`);
      const userToApprove = allUsers.find(u => u.email.toLowerCase() === targetEmail.toLowerCase().trim());
      if (userToApprove) {
        await updateUserProfileStatus(userToApprove.uid, 'approved');
        log.push(`Successfully approved user: ${userToApprove.email} (${userToApprove.uid})`);
        approvedCount++;
      } else {
        log.push(`No registered user found with email "${targetEmail}".`);
      }
    } else if (approveAll) {
      log.push('Auto-approving all pending user registrations...');
      const pendingUsers = allUsers.filter(u => u.status === 'pending');
      for (const user of pendingUsers) {
        await updateUserProfileStatus(user.uid, 'approved');
        log.push(`Approved pending user: ${user.email}`);
        approvedCount++;
      }
      log.push(`Approved ${approvedCount} pending users in total.`);
    }

    return NextResponse.json({
      success: true,
      message: 'Database seeding completed successfully.',
      log,
      summary: {
        productsCount: products.length,
        usersCount: allUsers.length,
        approvedUsersCount: approvedCount
      }
    });

  } catch (error: any) {
    console.error('Database seeding error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error',
      stack: error.stack
    }, { status: 500 });
  }
}
