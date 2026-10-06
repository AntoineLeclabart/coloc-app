import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Api, Depense } from '../api';
import { EurosPipe, isoDate, versCentimes } from '../format';
import { MoisCourant } from '../mois';

/** Dernier payeur choisi sur cet appareil : en général, c'est son propriétaire. */
const CLE_PAYEUR = 'coloc.payeur';

@Component({
  selector: 'app-depenses',
  imports: [FormsModule, EurosPipe],
  templateUrl: './depenses.html',
  host: { '(document:keydown.escape)': 'fermer()' },
  styles: `
    .tuiles.total {
      margin: 0 0 0.75rem;
    }
    /* Place pour que le bouton + ne cache pas la dernière dépense. */
    :host {
      display: block;
      padding-bottom: 72px;
    }
  `,
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
  protected total = computed(() => (this.depenses.value() ?? []).reduce((s, d) => s + d.montant, 0));

  protected feuilleOuverte = signal(false);
  protected libelle = signal('');
  protected montant = signal('');
  protected payeurId = signal<number | null>(null);
  protected categorieId = signal<number | null>(null);
  protected date = signal(isoDate(new Date()));
  /** Membres exclus de la dépense (par défaut personne). */
  protected exclus = signal<Set<number>>(new Set());
  protected erreur = signal('');
  /** Dépense en cours de modification (null = ajout). */
  protected enEdition = signal<number | null>(null);

  protected ouvrir(): void {
    this.reinitialiser();
    this.payeurId.set(lirePayeur());
    this.feuilleOuverte.set(true);
  }

  protected editer(d: Depense): void {
    const membres = this.membres.value() ?? [];
    this.reinitialiser();
    this.enEdition.set(d.id);
    this.libelle.set(d.libelle);
    this.montant.set((d.montant / 100).toFixed(2).replace('.', ','));
    this.payeurId.set(d.payeurId);
    this.categorieId.set(d.categorieId);
    this.date.set(d.date);
    this.exclus.set(new Set(d.participantIds.length ? membres.filter((m) => !d.participantIds.includes(m.id)).map((m) => m.id) : []));
    this.feuilleOuverte.set(true);
  }

  protected fermer(): void {
    this.feuilleOuverte.set(false);
  }

  private reinitialiser(): void {
    this.enEdition.set(null);
    this.libelle.set('');
    this.montant.set('');
    this.date.set(isoDate(new Date()));
    this.exclus.set(new Set());
    this.erreur.set('');
  }

  protected basculer(id: number): void {
    const s = new Set(this.exclus());
    if (s.has(id)) {
      s.delete(id);
    } else {
      s.add(id);
    }
    this.exclus.set(s);
  }

  protected enregistrer(): void {
    const membres = this.membres.value() ?? [];
    const exclus = this.exclus();
    const id = this.enEdition();
    if (exclus.size === membres.length) {
      this.erreur.set('Choisis au moins une personne.');
      return;
    }
    this.erreur.set('');
    const depense = {
      libelle: this.libelle(),
      montant: versCentimes(this.montant()),
      payeurId: this.payeurId()!,
      categorieId: this.categorieId()!,
      date: this.date(),
      participantIds: exclus.size ? membres.filter((m) => !exclus.has(m.id)).map((m) => m.id) : [],
    };
    (id === null ? this.api.creerDepense(depense) : this.api.modifierDepense({ ...depense, id })).subscribe({
      next: (d) => {
        ecrirePayeur(d.payeurId);
        this.fermer();
        this.mois.mois.set(d.date.slice(0, 7));
        this.depenses.reload();
      },
      error: () => this.erreur.set('Dépense refusée : vérifie les champs.'),
    });
  }

  protected supprimer(): void {
    const id = this.enEdition();
    if (id !== null && confirm('Supprimer cette dépense ?')) {
      this.api.supprimerDepense(id).subscribe(() => {
        this.fermer();
        this.depenses.reload();
      });
    }
  }

  protected jour(date: string): string {
    return new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  }
}

function lirePayeur(): number | null {
  try {
    const v = localStorage.getItem(CLE_PAYEUR);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

function ecrirePayeur(id: number): void {
  try {
    localStorage.setItem(CLE_PAYEUR, String(id));
  } catch {
    // Stockage indisponible (navigation privée) : on s'en passe.
  }
}
