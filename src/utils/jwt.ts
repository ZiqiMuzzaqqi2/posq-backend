import * as jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function getJwtSecret(): string {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }
  return JWT_SECRET;
}

function getJwtExpiry(): string | number {
  return JWT_EXPIRES_IN;
}

export interface TokenPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  branchId: string;
}

/**
 * Membuat JWT token dari data user
 * @param payload - Data user yang akan disimpan di token
 * @returns JWT token string
 */
export function generateToken(payload: TokenPayload): string {
  const secret: jwt.Secret = getJwtSecret();
  const options: jwt.SignOptions = { expiresIn: getJwtExpiry() as jwt.SignOptions["expiresIn"] };

  return jwt.sign(payload as object, secret, options);
}

/**
 * Verifikasi JWT token dan mengembalikan payload-nya
 * @param token - JWT token
 * @returns Payload token atau null jika invalid
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret() as jwt.Secret);
    if (typeof decoded !== "object" || decoded === null) {
      return null;
    }

    const payload = decoded as TokenPayload;

    if (
      typeof payload.id === "string" &&
      typeof payload.email === "string" &&
      typeof payload.name === "string" &&
      typeof payload.role === "string" &&
      typeof payload.branchId === "string"
    ) {
      return payload;
    }

    return null;
  } catch (error) {
    return null;
  }
}
