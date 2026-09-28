import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Api } from '../api';
import { isoDate, semaines } from '../format';

@Component({
  selector: 'app-absences',
  imports: [FormsModule],
  templateUrl: './absences.html',
})
export class AbsencesPage {
  private api = inject(Api);

  protected membres = rxResource({ stream: () => this.api.membres() });
  protected absences = rxResource({ stream: () => this.api.absences() });
  protected noms = computed(() => Object.fromEntries((this.membres.value() ?? []).map((m) => [m.id, m.nom])));

  protected membreId = signal<number | null>(null);
  protected date = signal(isoDate(new Date()));
  protected nombre = signal(1);
  protected erreur = signal('');

  protected apercu = computed(() => semaines(this.date(), this.nombre() || 1));

  protected ajouter(): void {
    this.erreur.set('');
    this.api.creerAbsence({ membreId: this.membreId()!, ...this.apercu() }).subscribe({
      next: () => this.absences.reload(),
      error: () => this.erreur.set('Absence refusée : vérifie les champs.'),
    });
  }

  protected supprimer(id: number): void {
    this.api.supprimerAbsence(id).subscribe(() => this.absences.reload());
  }

  protected jour(date: string): string {
    return new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  }
}
