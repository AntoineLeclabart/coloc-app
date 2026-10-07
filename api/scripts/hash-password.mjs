// Calcule le hash du mot de passe de la coloc, à mettre dans le secret
// COLOC_MOT_DE_PASSE_HASH (ou dans .dev.vars en local).
//   npm run hash-password
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline/promises';

// L'offre gratuite de Cloudflare limite chaque requête à 10 ms de calcul :
// 10 000 itérations tiennent dans ce budget. Le hash reste dans un secret
// Cloudflare, il n'a pas besoin d'être plus coûteux.
const ITERATIONS = 10_000;

const rl = createInterface({ input: process.stdin, output: process.stdout });
const motDePasse = await rl.question('Mot de passe de la coloc : ');
rl.close();
if (!motDePasse) {
  console.error('Mot de passe vide.');
  process.exit(1);
}

const sel = randomBytes(16);
const hash = pbkdf2Sync(motDePasse, sel, ITERATIONS, 32, 'sha256');
console.log(`\npbkdf2-sha256:${ITERATIONS}:${sel.toString('base64url')}:${hash.toString('base64url')}`);
