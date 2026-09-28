import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Api, Virement } from '../api';
import { EurosPipe } from '../format';
import { MoisCourant } from '../mois';

@Component({
  selector: 'app-bilan',
  imports: [EurosPipe],
  templateUrl: './bilan.html',
})
export class BilanPage {
  private api = inject(Api);
  protected mois = inject(MoisCourant);

  protected bilan = rxResource({
    params: () => this.mois.mois(),
    stream: ({ params }) => this.api.bilan(params),
  });

  protected noms = computed(() => {
    const noms: Record<number, string> = {};
    for (const m of this.bilan.value()?.membres ?? []) {
      noms[m.id] = m.nom;
    }
    return noms;
  });

  protected marquerPaye(v: Virement): void {
    this.api
      .creerRemboursement({ ...v, mois: this.mois.mois() })
      .subscribe(() => this.bilan.reload());
  }

  protected annulerRemboursement(id: number): void {
    this.api.supprimerRemboursement(id).subscribe(() => this.bilan.reload());
  }
}
