import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from './auth';
import { MoisCourant } from './mois';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly mois = inject(MoisCourant);
  private auth = inject(Auth);
  private router = inject(Router);

  /** Pas de navigation sur l'écran de connexion. */
  protected enConnexion = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.startsWith('/connexion')),
    ),
  );

  protected deconnexion(): void {
    this.auth.deconnexion().subscribe(() => this.router.navigate(['/connexion']));
  }
}
