/**
 * FusionOS Password Service
 *
 * Argon2id password hashing — the industry standard for password storage.
 * Never stores plaintext, never logs passwords, never exposes hashes.
 */

import { Injectable, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);

  /**
   * Hash a password using Argon2id.
   * Uses memory-hard parameters to resist GPU/ASIC attacks.
   */
  async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3, // 3 iterations
      parallelism: 4, // 4 threads
    });
  }

  /**
   * Verify a password against a stored hash.
   * Returns true if the password matches, false otherwise.
   * Constant-time comparison — resistant to timing attacks.
   */
  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      // If verification fails (e.g., malformed hash), treat as mismatch
      this.logger.warn('Password verification failed — possible malformed hash');
      return false;
    }
  }

  /**
   * Validate password policy.
   * Returns null if valid, or an error message.
   */
  validatePasswordPolicy(password: string): string | null {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (password.length > 128) {
      return 'Password must be no more than 128 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  }
}
