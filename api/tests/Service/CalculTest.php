<?php

namespace App\Tests\Service;

use App\Service\Calcul;
use PHPUnit\Framework\TestCase;

class CalculTest extends TestCase
{
    private Calcul $calcul;

    protected function setUp(): void
    {
        // Bob absent 2 semaines en novembre.
        $this->calcul = new Calcul(
            ['Alice', 'Bob', 'Chloé'],
            ['Bob' => [['debut' => '2026-11-09', 'fin' => '2026-11-22']]],
        );
    }

    public function testJoursPresence(): void
    {
        $this->assertSame(14, $this->calcul->joursPresence('Bob', '2026-11-02', '2026-11-29'));
        $this->assertSame(16, $this->calcul->joursPresence('Bob', '2026-11-01', '2026-11-30'));
    }

    public function testExempleDeLaConception(): void
    {
        $periode = ['debut' => '2026-11-02', 'fin' => '2026-11-29'];
        $depenses = [
            ['payeur' => 'Alice', 'montant' => 150000, 'type' => 'fixe'] + $periode,
            ['payeur' => 'Bob', 'montant' => 3000, 'type' => 'fixe'] + $periode,
            ['payeur' => 'Chloé', 'montant' => 60000, 'type' => 'variable'] + $periode,
        ];

        $this->assertSame(['Alice' => 24000, 'Bob' => 12000, 'Chloé' => 24000], $this->calcul->parts($depenses[2]));
        $this->assertSame(['Alice' => 50000, 'Bob' => 50000, 'Chloé' => 50000], $this->calcul->parts($depenses[0]));

        $soldes = $this->calcul->soldes($depenses);
        $this->assertSame(['Alice' => 75000, 'Bob' => -60000, 'Chloé' => -15000], $soldes);
        $this->assertSame([
            ['de' => 'Bob', 'a' => 'Alice', 'montant' => 60000],
            ['de' => 'Chloé', 'a' => 'Alice', 'montant' => 15000],
        ], Calcul::remboursements($soldes));
    }

    public function testVariableSansPeriodeUtiliseLeMois(): void
    {
        // Novembre : 30 jours, Bob présent 16.
        $parts = $this->calcul->parts(['montant' => 30000, 'type' => 'variable', 'date' => '2026-11-15']);
        $this->assertSame(['Alice' => 11842, 'Bob' => 6316, 'Chloé' => 11842], $parts);
    }

    public function testPoidsPersonnalises(): void
    {
        $parts = $this->calcul->parts(['montant' => 150000, 'type' => 'fixe', 'poids' => ['Alice' => 1.2]]);
        $this->assertSame(['Alice' => 56250, 'Bob' => 46875, 'Chloé' => 46875], $parts);
    }

    public function testAucunCentimePerdu(): void
    {
        $this->assertSame(['A' => 334, 'B' => 333, 'C' => 333], Calcul::repartir(1000, ['A' => 1, 'B' => 1, 'C' => 1]));
    }

    public function testToutLeMondeAbsentDonnePartageEgal(): void
    {
        $aout = [['debut' => '2026-08-01', 'fin' => '2026-08-31']];
        $calcul = new Calcul(['A', 'B'], ['A' => $aout, 'B' => $aout]);
        $this->assertSame(['A' => 50, 'B' => 50], $calcul->parts(['montant' => 100, 'type' => 'variable', 'date' => '2026-08-10']));
    }

    public function testBilanMensuelIgnoreLesAutresMois(): void
    {
        $bilan = $this->calcul->bilanMensuel([
            ['payeur' => 'Alice', 'montant' => 150000, 'type' => 'fixe', 'date' => '2026-11-01'],
            ['payeur' => 'Bob', 'montant' => 99900, 'type' => 'fixe', 'date' => '2026-12-01'],
        ], '2026-11');
        $this->assertSame(['Alice' => 100000, 'Bob' => -50000, 'Chloé' => -50000], $bilan['soldes']);
    }
}
