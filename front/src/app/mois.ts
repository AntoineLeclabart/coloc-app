import { Injectable, signal } from '@angular/core';
import { isoDate } from './format';

/** Mois affiché, partagé entre les pages (AAAA-MM). */
@Injectable({ providedIn: 'root' })
export class MoisCourant {
  readonly mois = signal(isoDate(new Date()).slice(0, 7));

  decaler(delta: number): void {
    const [a, m] = this.mois().split('-').map(Number);
    const d = new Date(a, m - 1 + delta, 1);
    this.mois.set(isoDate(d).slice(0, 7));
  }

  libelle(): string {
    const [a, m] = this.mois().split('-').map(Number);
    return new Date(a, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }
}
