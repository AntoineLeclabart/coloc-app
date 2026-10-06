import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../auth';

@Component({
  selector: 'app-connexion',
  imports: [FormsModule],
  template: `
    <section class="carte connexion">
      <h1>Coloc</h1>
      <form class="champs" (ngSubmit)="valider()">
        <label>
          Mot de passe de la coloc
          <input type="password" name="motDePasse" [(ngModel)]="motDePasse" autocomplete="current-password" required autofocus />
        </label>
        @if (erreur()) {
          <p class="erreur">Mot de passe incorrect.</p>
        }
        <button class="principal large" [disabled]="!motDePasse() || enCours()">Entrer</button>
      </form>
    </section>
  `,
  styles: `
    .connexion {
      max-width: 420px;
      margin: 15vh auto 0;
    }
    h1 {
      margin: 0 0 1rem;
      font-size: 1.6rem;
    }
  `,
})
export class ConnexionPage {
  private auth = inject(Auth);
  private router = inject(Router);

  /** Page à rouvrir après connexion (paramètre ?retour=). */
  readonly retour = input<string>();

  protected motDePasse = signal('');
  protected erreur = signal(false);
  protected enCours = signal(false);

  protected valider(): void {
    this.enCours.set(true);
    this.erreur.set(false);
    this.auth.connexion(this.motDePasse()).subscribe({
      next: () => this.router.navigateByUrl(this.retour()?.startsWith('/') && !this.retour()!.startsWith('/connexion') ? this.retour()! : '/bilan'),
      error: () => {
        this.erreur.set(true);
        this.enCours.set(false);
      },
    });
  }
}
