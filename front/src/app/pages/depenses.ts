import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Api } from '../api';
import { EurosPipe, isoDate, versCentimes } from '../format';
import { MoisCourant } from '../mois';

@Component({
  selector: 'app-depenses',
  imports: [FormsModule, EurosPipe],
  templateUrl: './depenses.html',
})
export class DepensesPage {
  private api = inject(Api);
  protected mois = inject(MoisCourant);

  protected membres = rxResource({ stream: () => this.api.membres() });
  protected categories = rxResource({ stream: () => this.api.categories() });
  protected depenses = rxResource({
    params: () => this.mois.mois(),
    stream: ({ params }) => this.api.depenses(params),
  });

  protected noms = computed(() => Object.fromEntries((this.membres.value() ?? []).map((m) => [m.id, m.nom])));
  protected cats = computed(() => Object.fromEntries((this.categories.value() ?? []).map((c) => [c.id, c])));

  protected libelle = signal('');
  protected montant = signal('');
  protected payeurId = signal<number | null>(null);
  protected categorieId = signal<number | null>(null);
  protected date = signal(isoDate(new Date()));
  /** Membres exclus de la dépense (par défaut personne). */
  protected exclus = signal<Set<number>>(new Set());
  protected erreur = signal('');

  protected basculer(id: number): void {
    const s = new Set(this.exclus());
    if (s.has(id)) {
      s.delete(id);
    } else {
      s.add(id);
    }
    this.exclus.set(s);
  }

  protected ajouter(): void {
    const membres = this.membres.value() ?? [];
    const exclus = this.exclus();
    this.erreur.set('');
    this.api
      .creerDepense({
        libelle: this.libelle(),
        montant: versCentimes(this.montant()),
        payeurId: this.payeurId()!,
        categorieId: this.categorieId()!,
        date: this.date(),
        participantIds: exclus.size ? membres.filter((m) => !exclus.has(m.id)).map((m) => m.id) : [],
      })
      .subscribe({
        next: (d) => {
          this.libelle.set('');
          this.montant.set('');
          this.exclus.set(new Set());
          this.mois.mois.set(d.date.slice(0, 7));
          this.depenses.reload();
        },
        error: () => this.erreur.set('Dépense refusée : vérifie les champs.'),
      });
  }

  protected supprimer(id: number): void {
    if (confirm('Supprimer cette dépense ?')) {
      this.api.supprimerDepense(id).subscribe(() => this.depenses.reload());
    }
  }
}
