<?php
declare(strict_types=1);

require __DIR__ . '/../src/Calcul.php';

use Coloc\Calcul;

function verifie(bool $ok, string $msg): void
{
    echo ($ok ? "OK   " : "ECHEC ") . $msg . PHP_EOL;
    if (!$ok) exit(1);
}

// Exemple de la conception : période du 2 au 29 novembre 2026 (4 semaines),
// Bob absent 2 semaines.
$calc = new Calcul(
    ['Alice', 'Bob', 'Chloé'],
    ['Bob' => [['debut' => '2026-11-09', 'fin' => '2026-11-22']]],
);
$periode = ['debut' => '2026-11-02', 'fin' => '2026-11-29'];

$depenses = [
    ['payeur' => 'Alice', 'montant' => 150000, 'type' => 'fixe'] + $periode,     // loyer
    ['payeur' => 'Bob',   'montant' => 3000,   'type' => 'fixe'] + $periode,     // internet
    ['payeur' => 'Chloé', 'montant' => 60000,  'type' => 'variable'] + $periode, // courses
];

verifie($calc->joursPresence('Bob', '2026-11-02', '2026-11-29') === 14, "Bob présent 14 jours sur 28");
verifie($calc->parts($depenses[2]) === ['Alice' => 24000, 'Bob' => 12000, 'Chloé' => 24000], "courses 240 / 120 / 240");
verifie($calc->parts($depenses[0]) === ['Alice' => 50000, 'Bob' => 50000, 'Chloé' => 50000], "loyer non affecté par l'absence");

$soldes = $calc->soldes($depenses);
verifie($soldes === ['Alice' => 75000, 'Bob' => -60000, 'Chloé' => -15000], "soldes +750 / -600 / -150");
verifie(Calcul::remboursements($soldes) === [
    ['de' => 'Bob', 'a' => 'Alice', 'montant' => 60000],
    ['de' => 'Chloé', 'a' => 'Alice', 'montant' => 15000],
], "Bob verse 600 à Alice, Chloé verse 150 à Alice");

// Arrondis : 10 € entre 3 → aucun centime perdu.
$r = Calcul::repartir(1000, ['A' => 1, 'B' => 1, 'C' => 1]);
verifie(array_sum($r) === 1000, "10 € / 3 = " . implode(' + ', $r) . " centimes");

// Poids personnalisés sur une dépense fixe (ex. grande chambre).
verifie($calc->parts(['montant' => 150000, 'type' => 'fixe', 'poids' => ['Alice' => 1.2]]) === ['Alice' => 56250, 'Bob' => 46875, 'Chloé' => 46875], "loyer pondéré grande chambre");

// Dépense variable sans période explicite : le mois de la date.
verifie($calc->parts(['montant' => 30000, 'type' => 'variable', 'date' => '2026-11-15'])['Bob'] === 6316, "courses du 15/11 : période = novembre entier (Bob 16 j sur 30)");

// Tout le monde absent : partage égal.
$vide = new Calcul(['A', 'B'], ['A' => [['debut' => '2026-08-01', 'fin' => '2026-08-31']], 'B' => [['debut' => '2026-08-01', 'fin' => '2026-08-31']]]);
verifie($vide->parts(['montant' => 100, 'type' => 'variable', 'date' => '2026-08-10']) === ['A' => 50, 'B' => 50], "tous absents → partage égal");

// Bilan mensuel : seules les dépenses de novembre comptent.
$bilan = $calc->bilanMensuel([
    ['payeur' => 'Alice', 'montant' => 150000, 'type' => 'fixe', 'date' => '2026-11-01'],
    ['payeur' => 'Chloé', 'montant' => 60000, 'type' => 'variable', 'date' => '2026-11-20'],
    ['payeur' => 'Bob', 'montant' => 99900, 'type' => 'fixe', 'date' => '2026-12-01'],
], '2026-11');
verifie(array_sum($bilan['soldes']) === 0 && $bilan['soldes']['Bob'] < -50000, "bilan de novembre ignore la dépense de décembre");
