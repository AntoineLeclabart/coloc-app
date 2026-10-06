import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Api, Virement } from '../api';
import { EurosPipe } from '../format';
import { MoisCourant } from '../mois';

@Component({
  selector: 'app-bilan',
  imports: [EurosPipe],
  templateUrl: './bilan.html',
  styles: `
    li.detail {
      display: block;
      padding: 0;
    }
    summary {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-height: 56px;
      padding: 0.6rem 1rem;
    }
    summary::after {
      content: '›';
      color: var(--texte-doux);
      font-size: 1.3rem;
      transition: transform 0.15s;
    }
    details[open] summary::after {
      transform: rotate(90deg);
    }
    dl {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.3rem 1rem;
      margin: 0;
      padding: 0 2.4rem 0.8rem 1rem;
    }
    dt {
      color: var(--texte-doux);
    }
    dd {
      margin: 0;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
  `,
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
