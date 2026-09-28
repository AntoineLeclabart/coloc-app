import { semaines, versCentimes } from './format';

describe('format', () => {
  it('convertit une saisie en centimes', () => {
    expect(versCentimes('12,5')).toBe(1250);
    expect(versCentimes('0.1')).toBe(10);
    expect(versCentimes(19.99)).toBe(1999);
  });

  it('cale une absence sur des semaines complètes du lundi au dimanche', () => {
    // Mercredi 11 novembre 2026 → semaine du lundi 9.
    expect(semaines('2026-11-11', 2)).toEqual({ debut: '2026-11-09', fin: '2026-11-22' });
  });
});
