/**
 * Un seul compte partagé par la coloc. Le mot de passe est vérifié contre
 * COLOC_MOT_DE_PASSE_HASH (PBKDF2, voir scripts/hash-password.mjs), puis un
 * cookie signé garde l'appareil connecté un an.
 *
 * La signature dépend aussi du hash : changer le mot de passe déconnecte
 * tous les appareils.
 */

export const COOKIE = 'coloc_session';
export const DUREE = 365 * 24 * 3600;

const encodeur = new TextEncoder();

function versBase64Url(octets: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(octets)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

function depuisBase64Url(texte: string): Uint8Array {
  const b64 = texte.replaceAll('-', '+').replaceAll('_', '/');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** Format : pbkdf2-sha256:<itérations>:<sel base64url>:<hash base64url> */
export async function verifierMotDePasse(motDePasse: string, hash: string | undefined): Promise<boolean> {
  const [algo, iterations, sel, attendu] = (hash ?? '').split(':');
  if (algo !== 'pbkdf2-sha256' || !sel || !attendu) {
    return false;
  }
  try {
    const cle = await crypto.subtle.importKey('raw', encodeur.encode(motDePasse), 'PBKDF2', false, ['deriveBits']);
    const obtenu = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: depuisBase64Url(sel), iterations: Number(iterations) },
      cle,
      256,
    );
    const a = new Uint8Array(obtenu);
    const b = depuisBase64Url(attendu);
    return a.byteLength === b.byteLength && crypto.subtle.timingSafeEqual(a, b);
  } catch {
    // Hash mal formé dans la configuration.
    return false;
  }
}

async function cleDeSignature(secret: string, hash: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encodeur.encode(`${secret}\n${hash}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/** Jeton « expiration.signature » à mettre dans le cookie. */
export async function creerJeton(secret: string, hash: string, maintenant = Date.now()): Promise<string> {
  const expiration = String(Math.floor(maintenant / 1000) + DUREE);
  const signature = await crypto.subtle.sign('HMAC', await cleDeSignature(secret, hash), encodeur.encode(expiration));
  return `${expiration}.${versBase64Url(signature)}`;
}

export async function jetonValide(jeton: string | undefined, secret: string, hash: string, maintenant = Date.now()): Promise<boolean> {
  const [expiration, signature] = (jeton ?? '').split('.');
  if (!expiration || !signature || Number(expiration) * 1000 < maintenant) {
    return false;
  }
  try {
    return await crypto.subtle.verify(
      'HMAC',
      await cleDeSignature(secret, hash),
      depuisBase64Url(signature),
      encodeur.encode(expiration),
    );
  } catch {
    return false;
  }
}
