import { db } from './server/db';
import { saasAdmins } from './shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function createSaasAdminUser() {
  try {
    console.log('Creating SaaS Admin user...');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Check if admin already exists
    const existingAdmin = await db.select().from(saasAdmins).where(eq(saasAdmins.email, 'admin@firmrix.com')).limit(1);
    
    if (existingAdmin.length > 0) {
      console.log('SaaS Admin user already exists with email: admin@firmrix.com');
      return;
    }

    // Create the admin user
    const adminUser = await db.insert(saasAdmins).values({
      email: 'admin@firmrix.com',
      passwordHash: hashedPassword,
      displayName: 'FirmRix Administrator',
      role: 'owner',
      isActive: true,
    }).returning();

    console.log('SaaS Admin user created successfully:');
    console.log('Email: admin@firmrix.com');
    console.log('Password: admin123');
    console.log('Role: owner');
    console.log('User ID:', adminUser[0].id);
    
  } catch (error) {
    console.error('Error creating SaaS Admin user:', error);
  }
}

createSaasAdminUser();