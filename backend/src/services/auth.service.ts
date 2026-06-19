import pool from '../config/database';
import { User, JwtPayload, AuthTokens } from '../models/types';
import { generateTokens } from '../utils/jwt.util';
import { hashPassword, comparePassword } from '../utils/password.util';

/**
 * Authentication Service
 * จัดการการเข้าสู่ระบบและ Token
 */

// Login
export async function login(
  username: string,
  password: string
): Promise<{ user: Omit<User, 'password'>; tokens: AuthTokens } | null> {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
    [username]
  );
  const users = rows as User[];

  if (users.length === 0) return null;

  const user = users[0];
  const isMatch = await comparePassword(password, user.password);

  if (!isMatch) return null;

  const payload: JwtPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
  };

  const tokens = generateTokens(payload);

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  return { user: userWithoutPassword as Omit<User, 'password'>, tokens };
}

// Change password
export async function changePassword(
  userId: number,
  oldPassword: string,
  newPassword: string
): Promise<boolean> {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
  const users = rows as User[];

  if (users.length === 0) return false;

  const user = users[0];
  const isMatch = await comparePassword(oldPassword, user.password);

  if (!isMatch) return false;

  const hashedPassword = await hashPassword(newPassword);
  await pool.execute('UPDATE users SET password = ? WHERE id = ?', [
    hashedPassword,
    userId,
  ]);

  return true;
}

// Get user by ID
export async function getUserById(userId: number): Promise<Omit<User, 'password'> | null> {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
  const users = rows as User[];

  if (users.length === 0) return null;

  const { password: _, ...user } = users[0];
  return user as Omit<User, 'password'>;
}
