<?php
declare(strict_types=1);

namespace App\Service;

use DateTimeImmutable;

/**
 * Moteur de calcul des parts. Tous les montants sont en centimes (int).
 *
 * - Dépense "variable" : répartie au prorata des jours de présence de chacun
 *   sur la période couverte par la dépense (par défaut, le mois de la dépense).
 * - Dépense "fixe" : répartie selon des poids fixes (1 chacun par défaut),
 *   sans tenir compte des absences.
 */
final class Calcul
{
    /**
     * @param array<int|string, array{debut: string, fin: string}[]> $absences membre => périodes d'absence (dates incluses)
     * @param array<int|string>                                       $membres
     */
    public function __construct(
        private array $membres,
        private array $absences = [],
    ) {}

    /** Nombre de jours de présence d'un membre entre $debut et $fin inclus. */
    public function joursPresence(int|string $membre, string $debut, string $fin): int
    {
        $d = new DateTimeImmutable($debut);
        $f = new DateTimeImmutable($fin);
        $total = $d->diff($f)->days + 1;
        $absent = 0;
        foreach ($this->absences[$membre] ?? [] as $a) {
            $ad = max($d, new DateTimeImmutable($a['debut']));
            $af = min($f, new DateTimeImmutable($a['fin']));
            if ($ad <= $af) {
                $absent += $ad->diff($af)->days + 1;
            }
        }
        return max(0, $total - $absent);
    }

    /**
     * Parts de chacun pour une dépense.
     *
     * @param array{montant: int, type: 'fixe'|'variable', debut?: string, fin?: string,
     *              date?: string, poids?: array<string, int|float>, participants?: string[]} $depense
     * @return array<string, int> membre => centimes
     */
    public function parts(array $depense): array
    {
        $participants = $depense['participants'] ?? $this->membres;

        if ($depense['type'] === 'fixe') {
            $poids = [];
            foreach ($participants as $m) {
                $poids[$m] = $depense['poids'][$m] ?? 1;
            }
        } else {
            [$debut, $fin] = $this->periode($depense);
            $poids = [];
            foreach ($participants as $m) {
                $poids[$m] = $this->joursPresence($m, $debut, $fin);
            }
            // Tout le monde absent : on retombe sur un partage égal.
            if (array_sum($poids) == 0) {
                $poids = array_fill_keys($participants, 1);
            }
        }

        return self::repartir($depense['montant'], $poids);
    }

    /**
     * Soldes : positif = on lui doit de l'argent, négatif = il doit.
     *
     * @param array<array{payeur: string, montant: int}> $depenses
     * @return array<string, int>
     */
    public function soldes(array $depenses): array
    {
        $soldes = array_fill_keys($this->membres, 0);
        foreach ($depenses as $dep) {
            $soldes[$dep['payeur']] += $dep['montant'];
            foreach ($this->parts($dep) as $m => $part) {
                $soldes[$m] -= $part;
            }
        }
        return $soldes;
    }

    /**
     * Bilan d'un mois (format "2026-11") : ne garde que les dépenses datées
     * dans ce mois, puis calcule soldes et remboursements.
     *
     * @return array{soldes: array<string, int>, remboursements: array<array{de: string, a: string, montant: int}>}
     */
    public function bilanMensuel(array $depenses, string $mois): array
    {
        $duMois = array_filter($depenses, fn($d) => str_starts_with($d['date'] ?? $d['debut'], $mois));
        $soldes = $this->soldes($duMois);
        return ['soldes' => $soldes, 'remboursements' => self::remboursements($soldes)];
    }

    /**
     * Remboursements proposés (algorithme glouton : le plus gros débiteur
     * paie le plus gros créancier), en un minimum de virements en pratique.
     *
     * @param array<string, int> $soldes
     * @return array<array{de: string, a: string, montant: int}>
     */
    public static function remboursements(array $soldes): array
    {
        $crediteurs = array_filter($soldes, fn($s) => $s > 0);
        $debiteurs = array_map(fn($s) => -$s, array_filter($soldes, fn($s) => $s < 0));
        $virements = [];
        while ($crediteurs && $debiteurs) {
            arsort($crediteurs);
            arsort($debiteurs);
            $c = array_key_first($crediteurs);
            $d = array_key_first($debiteurs);
            $m = min($crediteurs[$c], $debiteurs[$d]);
            $virements[] = ['de' => $d, 'a' => $c, 'montant' => $m];
            $crediteurs[$c] -= $m;
            $debiteurs[$d] -= $m;
            if ($crediteurs[$c] === 0) unset($crediteurs[$c]);
            if ($debiteurs[$d] === 0) unset($debiteurs[$d]);
        }
        return $virements;
    }

    /**
     * Répartit un montant selon des poids, arrondi au centime, sans perdre
     * de centime (méthode du plus fort reste).
     *
     * @param array<string, int|float> $poids
     * @return array<string, int>
     */
    public static function repartir(int $montant, array $poids): array
    {
        $total = array_sum($poids);
        $parts = [];
        $restes = [];
        foreach ($poids as $m => $p) {
            $exact = $montant * $p / $total;
            $parts[$m] = (int) floor($exact);
            $restes[$m] = $exact - $parts[$m];
        }
        arsort($restes);
        $manquant = $montant - array_sum($parts);
        foreach (array_keys($restes) as $m) {
            if ($manquant-- <= 0) break;
            $parts[$m]++;
        }
        return $parts;
    }

    /** @return array{0: string, 1: string} */
    private function periode(array $depense): array
    {
        if (isset($depense['debut'], $depense['fin'])) {
            return [$depense['debut'], $depense['fin']];
        }
        $date = new DateTimeImmutable($depense['date']);
        return [$date->format('Y-m-01'), $date->format('Y-m-t')];
    }
}
