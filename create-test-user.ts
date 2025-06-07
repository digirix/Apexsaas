import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "./server/db";
import { users } from "./shared/schema";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createTestUser() {
  try {
    console.log("Creating test user...");
    
    // Hash the password "password123"
    const hashedPassword = await hashPassword("password123");
    console.log("Hashed password:", hashedPassword);
    
    // Check if test user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, "test@example.com")).limit(1);
    
    if (existingUser.length > 0) {
      console.log("Test user already exists, updating password...");
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.email, "test@example.com"));
      console.log("Test user password updated");
    } else {
      console.log("Creating new test user...");
      await db.insert(users).values({
        email: "test@example.com",
        password: hashedPassword,
        displayName: "Test User",
        username: "testuser",
        tenantId: 4, // Use existing tenant
        designationId: 1,
        departmentId: 1,
        isActive: true,
        isAdmin: false,
        isSuperAdmin: false
      });
      console.log("Test user created");
    }
    
    console.log("Test user credentials:");
    console.log("Email: test@example.com");
    console.log("Password: password123");
    
  } catch (error) {
    console.error("Error creating test user:", error);
  }
}

createTestUser().then(() => {
  console.log("Test user creation completed");
  process.exit(0);
}).catch(error => {
  console.error("Test user creation failed:", error);
  process.exit(1);
});