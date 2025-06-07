import { db } from './server/db.js';
import { users } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function resetPassword() {
  try {
    console.log('Resetting password for NewFirm3@gmail.com...');
    
    // Hash the new password
    const newPassword = 'password123';
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    console.log('New hashed password:', hashedPassword);
    
    // Update the user's password
    const result = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.email, 'NewFirm3@gmail.com'))
      .returning();
    
    if (result.length > 0) {
      console.log('Password reset successful for user:', result[0].email);
      console.log('You can now login with:');
      console.log('Email: NewFirm3@gmail.com');
      console.log('Password: password123');
    } else {
      console.log('User not found');
    }
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    process.exit(0);
  }
}

resetPassword();