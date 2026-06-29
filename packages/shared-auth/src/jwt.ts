import * as jose from 'jose';
import crypto from 'crypto';

export interface TokenPayload {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
  activeBranchId: string | null;
  jti?: string;
}

export class JwtService {
  /**
   * Sign an RS256 JWT access token (valid for 15 minutes by default).
   */
  public static async signAccessToken(
    payload: TokenPayload,
    privateKeyPem: string,
    expiresIn: string = '15m'
  ): Promise<string> {
    const privateKey = await jose.importPKCS8(privateKeyPem, 'RS256');
    return new jose.SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(privateKey);
  }

  /**
   * Verify an RS256 JWT access token.
   */
  public static async verifyAccessToken(
    token: string,
    publicKeyPem: string
  ): Promise<TokenPayload> {
    const publicKey = await jose.importSPKI(publicKeyPem, 'RS256');
    const { payload } = await jose.jwtVerify(token, publicKey, {
      algorithms: ['RS256'],
    });
    return payload as unknown as TokenPayload;
  }

  /**
   * Decode a JWT access token without signature verification (useful for logging metadata safely).
   */
  public static decodeAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jose.decodeJwt(token);
      return decoded as unknown as TokenPayload;
    } catch {
      return null;
    }
  }
}

export class RefreshTokenService {
  /**
   * Generates a cryptographically secure random refresh token and its SHA-256 hash.
   */
  public static generate(): { raw: string; hash: string } {
    const raw = crypto.randomBytes(40).toString('hex');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    return { raw, hash };
  }

  /**
   * Safely compares a raw token to its stored SHA-256 hash in constant-time.
   */
  public static verify(raw: string, hash: string): boolean {
    const hashedRaw = crypto.createHash('sha256').update(raw).digest('hex');
    try {
      return crypto.timingSafeEqual(
        Buffer.from(hashedRaw, 'hex'),
        Buffer.from(hash, 'hex')
      );
    } catch {
      return false;
    }
  }
}

/**
 * Generate a transient RSA 2048 key pair (for dev/testing fallbacks).
 */
export function generateRSAKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });
  return { publicKey, privateKey };
}
