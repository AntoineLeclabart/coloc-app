import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

/** Tous les montants sont en centimes. */
export interface Membre {
  id: number;
  nom: string;
}

export interface Absence {
  id: number;
  membreId: number;
  debut: string;
  fin: string;
}

export type TypeCategorie = 'fixe' | 'variable';

export interface Categorie {
  id: number;
  nom: string;
  type: TypeCategorie;
  /** membreId => poids (catégories fixes, 1 par défaut) */
  poids: Record<string, number>;
}

export interface Depense {
  id: number;
  libelle: string;
  montant: number;
  payeurId: number;
  categorieId: number;
  date: string;
  /** Vide = tout le monde. */
  participantIds: number[];
}

export interface Remboursement {
  id: number;
  deId: number;
  aId: number;
  montant: number;
  mois: string;
}

export interface Virement {
  deId: number;
  aId: number;
  montant: number;
}

export interface Bilan {
  mois: string;
  membres: (Membre & { joursPresence: number })[];
  joursDansLeMois: number;
  depenses: { depense: Depense; type: TypeCategorie; parts: Record<string, number> }[];
  totaux: Record<TypeCategorie, number>;
  soldes: Record<string, number>;
  remboursements: Remboursement[];
  soldesRestants: Record<string, number>;
  virements: Virement[];
}

@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);

  membres(): Observable<Membre[]> {
    return this.http.get<Membre[]>('/api/membres');
  }
  creerMembre(nom: string): Observable<Membre> {
    return this.http.post<Membre>('/api/membres', { nom });
  }
  supprimerMembre(id: number): Observable<void> {
    return this.http.delete<void>(`/api/membres/${id}`);
  }

  absences(): Observable<Absence[]> {
    return this.http.get<Absence[]>('/api/absences');
  }
  creerAbsence(a: Omit<Absence, 'id'>): Observable<Absence> {
    return this.http.post<Absence>('/api/absences', a);
  }
  supprimerAbsence(id: number): Observable<void> {
    return this.http.delete<void>(`/api/absences/${id}`);
  }

  categories(): Observable<Categorie[]> {
    return this.http.get<Categorie[]>('/api/categories');
  }
  creerCategorie(c: Omit<Categorie, 'id'>): Observable<Categorie> {
    return this.http.post<Categorie>('/api/categories', c);
  }
  modifierCategorie(c: Categorie): Observable<Categorie> {
    return this.http.put<Categorie>(`/api/categories/${c.id}`, c);
  }
  supprimerCategorie(id: number): Observable<void> {
    return this.http.delete<void>(`/api/categories/${id}`);
  }

  depenses(mois: string): Observable<Depense[]> {
    return this.http.get<Depense[]>('/api/depenses', { params: { mois } });
  }
  creerDepense(d: Omit<Depense, 'id'>): Observable<Depense> {
    return this.http.post<Depense>('/api/depenses', d);
  }
  modifierDepense(d: Depense): Observable<Depense> {
    return this.http.put<Depense>(`/api/depenses/${d.id}`, d);
  }
  supprimerDepense(id: number): Observable<void> {
    return this.http.delete<void>(`/api/depenses/${id}`);
  }

  creerRemboursement(r: Omit<Remboursement, 'id'>): Observable<Remboursement> {
    return this.http.post<Remboursement>('/api/remboursements', r);
  }
  supprimerRemboursement(id: number): Observable<void> {
    return this.http.delete<void>(`/api/remboursements/${id}`);
  }

  bilan(mois: string): Observable<Bilan> {
    return this.http.get<Bilan>(`/api/bilan/${mois}`);
  }
}
