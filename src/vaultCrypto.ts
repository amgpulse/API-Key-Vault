export interface ApiKey {
  id: string;
  serviceName: string;
  keyName: string;
  value: string;
  createdAt: number;
}

export interface EncryptedVault {
  version: 1;
  algorithm: 'AES-GCM';
  kdf: 'PBKDF2-SHA-256';
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

const ITERATIONS = 600_000;
const VAULT_STORAGE_KEY = 'api_vault_keys';
const VAULT_CONTEXT = new TextEncoder().encode('API-Key-Vault:v1');
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function randomBase64(byteLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(byteLength)));
  return encodeBase64(bytes);
}

async function deriveKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations: ITERATIONS
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export function isEncryptedVault(value: unknown): value is EncryptedVault {
  if (typeof value !== 'object' || value === null) return false;
  const vault = value as Record<string, unknown>;

  return vault.version === 1 &&
    vault.algorithm === 'AES-GCM' &&
    vault.kdf === 'PBKDF2-SHA-256' &&
    vault.iterations === ITERATIONS &&
    typeof vault.salt === 'string' &&
    /^[A-Za-z0-9+/]{22}==$/.test(vault.salt) &&
    typeof vault.iv === 'string' &&
    /^[A-Za-z0-9+/]{16}$/.test(vault.iv) &&
    typeof vault.ciphertext === 'string' &&
    vault.ciphertext.length >= 24 &&
    vault.ciphertext.length % 4 === 0;
}

export async function encryptVault(
  keys: ApiKey[],
  key: CryptoKey,
  salt: string
): Promise<EncryptedVault> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(JSON.stringify(keys));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: VAULT_CONTEXT },
    key,
    plaintext
  );

  return {
    version: 1,
    algorithm: 'AES-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations: ITERATIONS,
    salt,
    iv: encodeBase64(iv),
    ciphertext: encodeBase64(new Uint8Array(encrypted))
  };
}

export async function createVault(
  keys: ApiKey[],
  password: string
): Promise<{ vault: EncryptedVault; key: CryptoKey }> {
  const salt = randomBase64(16);
  const key = await deriveKey(password, decodeBase64(salt));
  return { vault: await encryptVault(keys, key, salt), key };
}

export async function decryptVault(
  vault: EncryptedVault,
  password: string
): Promise<{ keys: ApiKey[]; key: CryptoKey }> {
  const key = await deriveKey(password, decodeBase64(vault.salt));
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: decodeBase64(vault.iv),
      additionalData: VAULT_CONTEXT
    },
    key,
    decodeBase64(vault.ciphertext)
  );
  const parsed: unknown = JSON.parse(decoder.decode(plaintext));

  if (
    !Array.isArray(parsed) ||
    parsed.some(item =>
      typeof item !== 'object' ||
      item === null ||
      typeof item.id !== 'string' ||
      typeof item.serviceName !== 'string' ||
      typeof item.keyName !== 'string' ||
      typeof item.value !== 'string' ||
      typeof item.createdAt !== 'number' ||
      !Number.isFinite(item.createdAt)
    )
  ) {
    throw new Error('Decrypted vault data is invalid.');
  }

  return { keys: parsed as ApiKey[], key };
}

export function saveEncryptedVault(vault: EncryptedVault): void {
  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vault));
}
