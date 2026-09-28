<?php

namespace App\Entity;

enum TypeCategorie: string
{
    /** Répartie selon des poids fixes, sans tenir compte des absences. */
    case Fixe = 'fixe';
    /** Répartie au prorata des jours de présence sur le mois. */
    case Variable = 'variable';
}
