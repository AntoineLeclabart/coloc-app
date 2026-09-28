<?php

namespace App\Entity;

use App\Repository\AbsenceRepository;
use Doctrine\ORM\Mapping as ORM;

/** Période d'absence d'un membre, dates incluses. */
#[ORM\Entity(repositoryClass: AbsenceRepository::class)]
class Absence implements \JsonSerializable
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    public function __construct(
        #[ORM\ManyToOne]
        #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
        private Membre $membre,
        #[ORM\Column(type: 'date_immutable')]
        private \DateTimeImmutable $debut,
        #[ORM\Column(type: 'date_immutable')]
        private \DateTimeImmutable $fin,
    ) {
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getMembre(): Membre
    {
        return $this->membre;
    }

    public function getDebut(): \DateTimeImmutable
    {
        return $this->debut;
    }

    public function getFin(): \DateTimeImmutable
    {
        return $this->fin;
    }

    public function jsonSerialize(): array
    {
        return [
            'id' => $this->id,
            'membreId' => $this->membre->getId(),
            'debut' => $this->debut->format('Y-m-d'),
            'fin' => $this->fin->format('Y-m-d'),
        ];
    }
}
