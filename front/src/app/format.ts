import { Pipe, PipeTransform } from '@angular/core';

const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

/** Affiche un montant en centimes au format « 12,34 € ». */
@Pipe({ name: 'euros' })
export class EurosPipe implements PipeTransform {
  transform(centimes: number | null | undefined): string {
    return euros.format((centimes ?? 0) / 100);
  }
}

/** « 12,5 » ou « 12.5 » → 1250 centimes. */
export function versCentimes(saisie: string | number): number {
  return Math.round(Number(String(saisie).replace(',', '.')) * 100);
}

/** Date locale au format AAAA-MM-JJ. */
export function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Lundi de la semaine contenant la date. */
export function lundi(date: string): Date {
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/** Période de N semaines complètes (lundi → dimanche) à partir de la semaine de la date. */
export function semaines(date: string, nombre: number): { debut: string; fin: string } {
  const debut = lundi(date);
  const fin = new Date(debut);
  fin.setDate(fin.getDate() + 7 * nombre - 1);
  return { debut: isoDate(debut), fin: isoDate(fin) };
}
