import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Password Utility Functions
 * เข้ารหัสและตรวจสอบรหัสผ่าน
 */

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Compare password
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
