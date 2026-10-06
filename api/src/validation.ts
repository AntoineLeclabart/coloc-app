import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

export const MOIS = /^\d{4}-(0[1-9]|1[0-2])$/;

const id = z.number().int().positive();
const date = z.iso.date();

export const MembreInput = z.object({
  nom: z.string().trim().min(1).max(100),
});

export const AbsenceInput = z
  .object({ membreId: id, debut: date, fin: date })
  .refine((a) => a.fin >= a.debut, { message: 'La fin doit être après le début.', path: ['fin'] });

export const CategorieInput = z.object({
  nom: z.string().trim().min(1).max(100),
  type: z.enum(['fixe', 'variable']),
  /** membreId => poids (catégories fixes). */
  poids: z.record(z.string(), z.coerce.number().nonnegative()).default({}),
});

export const DepenseInput = z.object({
  libelle: z.string().trim().min(1).max(255),
  /** En centimes. */
  montant: z.number().int().positive(),
  payeurId: id,
  categorieId: id,
  date,
  /** Vide = tout le monde. */
  participantIds: z.array(id).default([]),
});

export const RemboursementInput = z
  .object({
    deId: id,
    aId: id,
    /** En centimes. */
    montant: z.number().int().positive(),
    mois: z.string().regex(MOIS),
  })
  .refine((r) => r.deId !== r.aId, { message: 'On ne se rembourse pas soi-même.', path: ['aId'] });

/** Lit et valide le corps JSON : 400 s'il est illisible, 422 s'il est invalide. */
export async function lire<S extends z.ZodType>(c: Context, schema: S): Promise<z.infer<S>> {
  let corps: unknown;
  try {
    corps = await c.req.json();
  } catch {
    throw new HTTPException(400, { message: 'JSON invalide.' });
  }
  const resultat = schema.safeParse(corps);
  if (!resultat.success) {
    throw new HTTPException(422, {
      res: Response.json({ error: 'Données invalides.', violations: z.flattenError(resultat.error) }, { status: 422 }),
    });
  }
  return resultat.data;
}
