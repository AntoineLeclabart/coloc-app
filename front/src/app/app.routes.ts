import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'bilan' },
  { path: 'bilan', title: 'Bilan', loadComponent: () => import('./pages/bilan').then((m) => m.BilanPage) },
  { path: 'depenses', title: 'Dépenses', loadComponent: () => import('./pages/depenses').then((m) => m.DepensesPage) },
  { path: 'absences', title: 'Absences', loadComponent: () => import('./pages/absences').then((m) => m.AbsencesPage) },
  { path: 'reglages', title: 'Réglages', loadComponent: () => import('./pages/reglages').then((m) => m.ReglagesPage) },
];
