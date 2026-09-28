import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../auth';

@Component({
  selector: 'app-connexion',
  imports: [FormsModule],
  template: `
    <section class="carte connexion">
      <h2>Mot de passe de la coloc</h2>
      <form class="ligne" (ngSubmit)="valider()">
        <label>
          Mot de passe
          <input type="password" name="motDePasse" [(ngModel)]="motDePasse" autocomplete="current-password" required autofocus />
        </label>
        <button class="principal" [disabled]="!motDePasse() || enCours()">Entrer</button>
      </form>
      @if (erreur()) {
        <p class="erreur">Mot de passe incorrect.</p>
      }
    </section>
  `,
  styles: `
    .connexion {
      max-width: 420px;
      margin: 3rem auto;
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
