import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Api, Categorie, TypeCategorie } from '../api';
import { Auth } from '../auth';

@Component({
  selector: 'app-reglages',
  imports: [FormsModule],
  templateUrl: './reglages.html',
  styles: `
    li.categorie {
      display: block;
    }
    .entete {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .poids {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(6.5rem, 1fr));
      gap: 0.5rem;
      margin: 0.25rem 0 0.4rem;
    }
    .poids label {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      font-size: 0.8rem;
      color: var(--texte-doux);
    }
    .ajout-categorie {
      margin-top: 1rem;
    }
    .champs p {
      margin: 0;
    }
  `,
})
export class ReglagesPage {
  private api = inject(Api);
  private auth = inject(Auth);

  protected membres = rxResource({ stream: () => this.api.membres() });
  protected categories = rxResource({ stream: () => this.api.categories() });

  protected nouveauMembre = signal('');
  protected nouvelleCategorie = signal('');
  protected nouveauType = signal<TypeCategorie>('variable');
  protected erreur = signal('');

  protected motDePasseActuel = signal('');
  protected nouveauMotDePasse = signal('');
  protected confirmation = signal('');
  protected motDePasseEnCours = signal(false);
  protected motDePasseErreur = signal('');
  protected motDePasseChange = signal(false);
  protected confirmationDifferente = computed(() => !!this.confirmation() && this.confirmation() !== this.nouveauMotDePasse());

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

  protected changerMotDePasse(): void {
    this.motDePasseEnCours.set(true);
    this.motDePasseErreur.set('');
    this.motDePasseChange.set(false);
    this.auth.changerMotDePasse(this.motDePasseActuel(), this.nouveauMotDePasse()).subscribe({
      next: () => {
        this.motDePasseActuel.set('');
        this.nouveauMotDePasse.set('');
        this.confirmation.set('');
        this.motDePasseChange.set(true);
        this.motDePasseEnCours.set(false);
      },
      error: (err: HttpErrorResponse) => {
        // Erreurs de validation de Symfony : { violations: [{ title }] }
        const violations: { title: string }[] = err.error?.violations ?? [];
        this.motDePasseErreur.set(violations.map((v) => v.title).join(' ') || 'Impossible de changer le mot de passe.');
        this.motDePasseEnCours.set(false);
      },
    });
  }
}
