<?php

namespace App\Entity;

use App\Repository\RemboursementRepository;
use Doctrine\ORM\Mapping as ORM;

/** Virement fait pour solder un mois donné. */
#[ORM\Entity(repositoryClass: RemboursementRepository::class)]
class Remboursement implements \JsonSerializable
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    public function __construct(
        #[ORM\ManyToOne]
        #[ORM\JoinColumn(nullable: false)]
        private Membre $de,
        #[ORM\ManyToOne]
        #[ORM\JoinColumn(nullable: false)]
        private Membre $a,
        /** En centimes. */
        #[ORM\Column]
        private int $montant,
        /** Mois soldé, format AAAA-MM. */
        #[ORM\Column(length: 7)]
        private string $mois,
    ) {
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getDe(): Membre
    {
        return $this->de;
    }

    public function getA(): Membre
    {
        return $this->a;
    }

    public function getMontant(): int
    {
        return $this->montant;
    }

    public function getMois(): string
    {
        return $this->mois;
    }

    public function jsonSerialize(): array
    {
        return [
            'id' => $this->id,
            'deId' => $this->de->getId(),
            'aId' => $this->a->getId(),
            'montant' => $this->montant,
            'mois' => $this->mois,
        ];
    }
}
