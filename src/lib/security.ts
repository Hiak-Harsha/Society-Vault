import crypto from 'crypto';
import prisma from './db';

const ALGORITHM_GCM = 'aes-256-gcm';
const ALGORITHM_CBC = 'aes-256-cbc';
const IV_LENGTH = 12; // For GCM
const IV_LENGTH_CBC = 16; // For CBC

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('ENCRYPTION_KEY or JWT_SECRET environment variable is not set');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Standard AES-256-GCM non-deterministic encryption.
 * Best for general sensitive fields (names, keys, settings).
 */
export function encrypt(text: string): string {
  if (!text) return '';
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM_GCM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('Encryption failed:', err);
    return text;
  }
}

/**
 * Standard AES-256-GCM decryption.
 */
export function decrypt(cipherText: string): string {
  if (!cipherText) return '';
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      // Return as is if not matching format (might be plaintext during migration/seeding)
      return cipherText;
    }
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getEncryptionKey();
    
    const decipher = crypto.createDecipheriv(ALGORITHM_GCM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    // Return original on error (graceful fallback)
    return cipherText;
  }
}

/**
 * Deterministic AES-256-CBC encryption.
 * Best for columns that need exact match querying (like unique email lookups or employee IDs).
 */
export function encryptDeterministic(text: string): string {
  if (!text) return '';
  try {
    const key = getEncryptionKey();
    // Derive a deterministic IV from the text and the key to prevent pattern analysis across rows but remain deterministic
    const hmac = crypto.createHmac('sha256', key).update(text).digest();
    const iv = hmac.subarray(0, IV_LENGTH_CBC);
    
    const cipher = crypto.createCipheriv(ALGORITHM_CBC, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (err) {
    console.error('Deterministic encryption failed:', err);
    return text;
  }
}

/**
 * Deterministic AES-256-CBC decryption.
 */
export function decryptDeterministic(cipherText: string): string {
  if (!cipherText) return '';
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 2) {
      return cipherText;
    }
    const [ivHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const key = getEncryptionKey();
    
    const decipher = crypto.createDecipheriv(ALGORITHM_CBC, key, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return cipherText;
  }
}

/**
 * Record decryption helpers to sanitize database outputs.
 */
export interface DecryptableMember {
  name: string;
  rank?: string | null;
}

export function decryptMember<T extends DecryptableMember | null>(member: T): T {
  if (!member) return member;
  return {
    ...member,
    name: decrypt(member.name),
    rank: member.rank ? decrypt(member.rank) : member.rank
  };
}

export function decryptContribution<T extends { paymentMethod?: string | null; referenceNumber?: string | null; member?: DecryptableMember | null } | null>(contrib: T): T {
  if (!contrib) return contrib;
  const decrypted = {
    ...contrib,
    paymentMethod: contrib.paymentMethod ? decrypt(contrib.paymentMethod) : contrib.paymentMethod,
    referenceNumber: contrib.referenceNumber ? decryptDeterministic(contrib.referenceNumber) : contrib.referenceNumber,
  };
  if (decrypted.member) {
    decrypted.member = decryptMember(decrypted.member);
  }
  return decrypted as T;
}

export function decryptRepayment<T extends { paymentMethod?: string | null; referenceNumber?: string | null; loan?: { applicant?: DecryptableMember | null } | null } | null>(repay: T): T {
  if (!repay) return repay;
  const decrypted = {
    ...repay,
    paymentMethod: repay.paymentMethod ? decrypt(repay.paymentMethod) : repay.paymentMethod,
    referenceNumber: repay.referenceNumber ? decryptDeterministic(repay.referenceNumber) : repay.referenceNumber,
  };
  if (decrypted.loan) {
    if (decrypted.loan.applicant) {
      decrypted.loan = {
        ...decrypted.loan,
        applicant: decryptMember(decrypted.loan.applicant)
      };
    }
  }
  return decrypted as T;
}

export function decryptTransaction<T extends { paymentMethod: string; referenceNumber: string; description?: string | null; member?: DecryptableMember | null } | null>(tx: T): T {
  if (!tx) return tx;
  const decrypted = {
    ...tx,
    paymentMethod: decrypt(tx.paymentMethod),
    referenceNumber: decryptDeterministic(tx.referenceNumber),
    description: tx.description ? decrypt(tx.description) : tx.description
  };
  if (decrypted.member) {
    decrypted.member = decryptMember(decrypted.member);
  }
  return decrypted as T;
}

export function decryptOrgPolicy<T extends { directoryApiKey?: string | null; directoryMapping?: string | null } | null>(policy: T): T {
  if (!policy) return policy;
  return {
    ...policy,
    directoryApiKey: policy.directoryApiKey ? decrypt(policy.directoryApiKey) : policy.directoryApiKey,
    directoryMapping: policy.directoryMapping ? decrypt(policy.directoryMapping) : policy.directoryMapping
  };
}

/**
 * Calculate SHA-256 hash for transaction chaining.
 */
export function calculateTransactionHash(tx: {
  id: string;
  orgId: string;
  type: string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string;
  timestamp: Date | string;
  previousHash: string;
}): string {
  const data = [
    tx.id,
    tx.orgId,
    tx.type,
    tx.amount.toFixed(2),
    tx.paymentMethod,
    tx.referenceNumber,
    new Date(tx.timestamp).toISOString(),
    tx.previousHash || ''
  ].join('|');
  
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Verify ledger integrity of an organization.
 */
export async function verifyLedger(orgId: string): Promise<{ isValid: boolean; message: string; tamperedTransactionId?: string }> {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { orgId },
      orderBy: [{ timestamp: 'asc' }, { id: 'asc' }]
    });

    let lastHash = '';
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      
      // Decrypt transaction fields for verification hash calculation
      const decryptedTx = decryptTransaction(tx);
      if (!decryptedTx) continue;

      // Check if previousHash matches
      if (tx.previousHash !== lastHash) {
        return {
          isValid: false,
          message: `Ledger link broken at TX ${decryptedTx.referenceNumber}. Expected previousHash '${lastHash}', got '${tx.previousHash}'.`,
          tamperedTransactionId: tx.id
        };
      }

      // Check current hash (must hash the DECRYPTED fields because that represents the original transaction data)
      const calculatedHash = calculateTransactionHash({
        id: decryptedTx.id,
        orgId: decryptedTx.orgId,
        type: decryptedTx.type,
        amount: decryptedTx.amount,
        paymentMethod: decryptedTx.paymentMethod,
        referenceNumber: decryptedTx.referenceNumber,
        timestamp: decryptedTx.timestamp,
        previousHash: decryptedTx.previousHash
      });

      if (tx.hash !== calculatedHash) {
        return {
          isValid: false,
          message: `Ledger data mismatch at TX ${decryptedTx.referenceNumber}. Expected hash '${calculatedHash}', got '${tx.hash}'.`,
          tamperedTransactionId: tx.id
        };
      }

      lastHash = tx.hash;
    }

    return {
      isValid: true,
      message: `Ledger verified successfully. Checked ${transactions.length} transactions in sequence. No tampering detected.`
    };
  } catch (error) {
    const err = error as Error;
    return {
      isValid: false,
      message: `Failed to verify ledger: ${err.message}`
    };
  }
}

/**
 * Validate IP against a single CIDR block or IP address.
 */
export function ipInCIDR(ip: string, cidr: string): boolean {
  try {
    const cleanIp = ip.trim();
    const cleanCidr = cidr.trim();
    
    if (!cleanCidr.includes('/')) {
      return cleanIp === cleanCidr;
    }
    
    const [range, bitsStr] = cleanCidr.split('/');
    const bits = parseInt(bitsStr, 10);
    
    if (cleanIp.includes('.') && range.includes('.')) {
      const ipParts = cleanIp.split('.').map(Number);
      const rangeParts = range.split('.').map(Number);
      
      if (ipParts.some(isNaN) || rangeParts.some(isNaN) || ipParts.length !== 4 || rangeParts.length !== 4) {
        return false;
      }
      
      const ipVal = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
      const rangeVal = (rangeParts[0] << 24) + (rangeParts[1] << 16) + (rangeParts[2] << 8) + rangeParts[3];
      
      const mask = bits === 0 ? 0 : ~((1 << (32 - bits)) - 1);
      
      return (ipVal & mask) === (rangeVal & mask);
    }
    
    return cleanIp === range;
  } catch {
    return false;
  }
}

/**
 * Verify client IP address against a comma-separated whitelist.
 */
export function isIpWhitelisted(ip: string, whitelistCsv: string): boolean {
  if (!whitelistCsv || whitelistCsv.trim() === '') return true; // Empty whitelist means access from anywhere
  
  let clientIp = ip.trim();
  // Standardize IPv6 localhosts
  if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
    clientIp = '127.0.0.1';
  }
  
  const rules = whitelistCsv.split(',').map(s => s.trim()).filter(Boolean);
  
  for (const rule of rules) {
    if (rule === '127.0.0.1' && clientIp === '127.0.0.1') return true;
    if (ipInCIDR(clientIp, rule)) {
      return true;
    }
  }
  
  return false;
}
