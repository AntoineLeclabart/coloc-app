import { describe, expect, it } from 'vitest';
import { Calcul, type DepenseCalcul } from '../src/calcul';

const objet = (m: Map<string, number>) => Object.fromEntries(m);

describe('Calcul', () => {
  // Bob absent 2 semaines en novembre.
  const calcul = new Calcul(['Alice', 'Bob', 'Chloé'], { Bob: [{ debut: '2026-11-09', fin: '2026-11-22' }] });

  it('compte les jours de présence', () => {
    expect(calcul.joursPresence('Bob', '2026-11-02', '2026-11-29')).toBe(14);
    expect(calcul.joursPresence('Bob', '2026-11-01', '2026-11-30')).toBe(16);
  });

  it("reproduit l'exemple de la conception", () => {
    const periode = { debut: '2026-11-02', fin: '2026-11-29' };
    const depenses: (DepenseCalcul & { payeur: string })[] = [
      { payeur: 'Alice', montant: 150000, type: 'fixe', ...periode },
      { payeur: 'Bob', montant: 3000, type: 'fixe', ...periode },
      { payeur: 'Chloé', montant: 60000, type: 'variable', ...periode },
    ];
    expect(objet(calcul.parts(depenses[2]))).toEqual({ Alice: 24000, Bob: 12000, Chloé: 24000 });
    expect(objet(calcul.parts(depenses[0]))).toEqual({ Alice: 50000, Bob: 50000, Chloé: 50000 });
    const soldes = calcul.soldes(depenses);
    expect(objet(soldes)).toEqual({ Alice: 75000, Bob: -60000, Chloé: -15000 });
    expect(Calcul.remboursements(soldes)).toEqual([
      { de: 'Bob', a: 'Alice', montant: 60000 },
      { de: 'Chloé', a: 'Alice', montant: 15000 },
    ]);
  });

  it('prend le mois de la dépense quand il n’y a pas de période', () => {
    // Novembre : 30 jours, Bob présent 16.
    const parts = calcul.parts({ montant: 30000, type: 'variable', date: '2026-11-15' });
    expect(objet(parts)).toEqual({ Alice: 11842, Bob: 6316, Chloé: 11842 });
  });

  it('applique les poids personnalisés', () => {
    const parts = calcul.parts({ montant: 150000, type: 'fixe', poids: { Alice: 1.2 } });
    expect(objet(parts)).toEqual({ Alice: 56250, Bob: 46875, Chloé: 46875 });
  });

  it('ne perd aucun centime', () => {
    const parts = Calcul.repartir(1000, new Map([['A', 1], ['B', 1], ['C', 1]]));
    expect([...parts]).toEqual([['A', 334], ['B', 333], ['C', 333]]);
  });

  it('partage également quand tout le monde est absent', () => {
    const aout = [{ debut: '2026-08-01', fin: '2026-08-31' }];
    const c = new Calcul(['A', 'B'], { A: aout, B: aout });
    expect(objet(c.parts({ montant: 100, type: 'variable', date: '2026-08-10' }))).toEqual({ A: 50, B: 50 });
  });

  it('ignore les autres mois dans le bilan mensuel', () => {
    const bilan = calcul.bilanMensuel(
      [
        { payeur: 'Alice', montant: 150000, type: 'fixe', date: '2026-11-01' },
        { payeur: 'Bob', montant: 99900, type: 'fixe', date: '2026-12-01' },
      ],
      '2026-11',
    );
    expect(objet(bilan.soldes)).toEqual({ Alice: 100000, Bob: -50000, Chloé: -50000 });
  });
});
