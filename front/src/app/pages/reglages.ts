import { Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Api, Categorie, TypeCategorie } from '../api';

@Component({
  selector: 'app-reglages',
  imports: [FormsModule],
  templateUrl: './reglages.html',
})
export class ReglagesPage {
  private api = inject(Api);

  protected membres = rxResource({ stream: () => this.api.membres() });
  protected categories = rxResource({ stream: () => this.api.categories() });

  protected nouveauMembre = signal('');
  protected nouvelleCategorie = signal('');
  protected nouveauType = signal<TypeCategorie>('variable');
  protected erreur = signal('');

  protected ajouterMembre(): void {
    this.api.creerMembre(this.nouveauMembre()).subscribe({
      next: () => {
        this.nouveauMembre.set('');
        this.membres.reload();
      },
      error: () => this.erreur.set('Ce nom existe déjà ?'),
    });
  }

  protected supprimerMembre(id: number): void {
    if (confirm('Supprimer ce coloc ? Impossible s\'il a déjà payé des dépenses.')) {
      this.api.supprimerMembre(id).subscribe({
        next: () => this.membres.reload(),
        error: () => this.erreur.set('Impossible : ce coloc a des dépenses ou des remboursements.'),
      });
    }
  }

  protected ajouterCategorie(): void {
    this.api.creerCategorie({ nom: this.nouvelleCategorie(), type: this.nouveauType(), poids: {} }).subscribe(() => {
      this.nouvelleCategorie.set('');
      this.categories.reload();
    });
  }

  protected poids(c: Categorie, membreId: number): number {
    return c.poids[membreId] ?? 1;
  }

  protected changerPoids(c: Categorie, membreId: number, valeur: string): void {
    const poids = { ...c.poids, [membreId]: Number(valeur.replace(',', '.')) };
    this.api.modifierCategorie({ ...c, poids }).subscribe(() => this.categories.reload());
  }

  protected supprimerCategorie(id: number): void {
    if (confirm('Supprimer cette catégorie ?')) {
      this.api.supprimerCategorie(id).subscribe({
        next: () => this.categories.reload(),
        error: () => this.erreur.set('Impossible : des dépenses utilisent cette catégorie.'),
      });
    }
  }
}
