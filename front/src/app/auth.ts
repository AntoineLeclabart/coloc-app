import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';

/** Un seul compte partagé par la coloc : seul le mot de passe est demandé. */
@Injectable({ providedIn: 'root' })
export class Auth {
  private http = inject(HttpClient);

  connexion(motDePasse: string): Observable<unknown> {
    return this.http.post('/api/login', { username: 'coloc', password: motDePasse });
  }

  deconnexion(): Observable<unknown> {
    return this.http.post('/api/logout', null);
  }
}

/** Renvoie vers l'écran de connexion dès que l'API répond 401. */
export const connexionInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && !req.url.endsWith('/api/login')) {
        router.navigate(['/connexion'], { queryParams: { retour: router.url } });
      }
      return throwError(() => err);
    }),
  );
};
