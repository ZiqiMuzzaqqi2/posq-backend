import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Hash password (untuk disimpan ke database)
 * @param plainPassword - Password dalam bentuk plain text
 * @returns Hashed password
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return await bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Membandingkan password plain dengan hashed password
 * @param plainPassword - Password yang dimasukkan user
 * @param hashedPassword - Password dari database
 * @returns boolean apakah cocok
 */
export async function comparePassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return await bcrypt.compare(plainPassword, hashedPassword);
}
