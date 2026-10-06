<?php

namespace App\Entity;

use App\Repository\ReglageRepository;
use Doctrine\ORM\Mapping as ORM;

/** Réglage de l'appli modifiable depuis l'interface (clé => valeur). */
#[ORM\Entity(repositoryClass: ReglageRepository::class)]
class Reglage
{
    public const MOT_DE_PASSE_HASH = 'mot_de_passe_hash';

    public function __construct(
        #[ORM\Id]
        #[ORM\Column(length: 50)]
        private string $cle,
        #[ORM\Column(type: 'text')]
        private string $valeur,
    ) {
    }

    public function getCle(): string
    {
        return $this->cle;
    }

    public function getValeur(): string
    {
        return $this->valeur;
    }

    public function setValeur(string $valeur): void
    {
        $this->valeur = $valeur;
    }
}
