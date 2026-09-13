import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
function key(secret: string) {
  const bytes = Buffer.from(secret, 'base64');
  if (bytes.length !== 32) throw new Error('INVALID_AUTH_SECRET');
  return bytes;
}
export function encrypt(value: string, secret: string, context: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(secret), nonce);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [nonce, cipher.getAuthTag(), encrypted].map((b) => b.toString('base64url')).join('.');
}
export function decrypt(value: string, secret: string, context: string) {
  const [nonce, tag, payload] = value.split('.').map((v) => Buffer.from(v, 'base64url'));
  if (!nonce || !tag || !payload) throw new Error('INVALID_ENCRYPTED_VALUE');
  const decipher = createDecipheriv('aes-256-gcm', key(secret), nonce);
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(payload), decipher.final()]).toString('utf8');
}
export function safeReturnPath(input: string | null) {
  return ['/', '/account', '/stream', '/vault', '/community'].includes(input ?? '')
    ? input!
    : '/account';
}
