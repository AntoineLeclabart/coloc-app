<?php

namespace App\Entity;

use App\Repository\DepenseRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: DepenseRepository::class)]
class Depense implements \JsonSerializable
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    /** Vide = tous les membres participent. */
    #[ORM\ManyToMany(targetEntity: Membre::class)]
    private Collection $participants;

    /**
     * @param Membre[] $participants
     */
    public function __construct(
        #[ORM\Column(length: 255)]
        private string $libelle,
        /** En centimes. */
        #[ORM\Column]
        private int $montant,
        #[ORM\ManyToOne]
        #[ORM\JoinColumn(nullable: false)]
        private Membre $payeur,
        #[ORM\ManyToOne]
        #[ORM\JoinColumn(nullable: false)]
        private Categorie $categorie,
        #[ORM\Column(type: 'date_immutable')]
        private \DateTimeImmutable $date,
        array $participants = [],
    ) {
        $this->participants = new ArrayCollection($participants);
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getLibelle(): string
    {
        return $this->libelle;
    }

    public function getMontant(): int
    {
        return $this->montant;
    }

    public function getPayeur(): Membre
    {
        return $this->payeur;
    }

    public function getCategorie(): Categorie
    {
        return $this->categorie;
    }

    public function getDate(): \DateTimeImmutable
    {
        return $this->date;
    }

    /** @return Membre[] */
    public function getParticipants(): array
    {
        return $this->participants->toArray();
    }

    /**
     * @param Membre[] $participants
     */
    public function modifier(string $libelle, int $montant, Membre $payeur, Categorie $categorie, \DateTimeImmutable $date, array $participants): void
    {
        $this->libelle = $libelle;
        $this->montant = $montant;
        $this->payeur = $payeur;
        $this->categorie = $categorie;
        $this->date = $date;
        $this->participants = new ArrayCollection($participants);
    }

    public function jsonSerialize(): array
    {
        return [
            'id' => $this->id,
            'libelle' => $this->libelle,
            'montant' => $this->montant,
            'payeurId' => $this->payeur->getId(),
            'categorieId' => $this->categorie->getId(),
            'date' => $this->date->format('Y-m-d'),
            'participantIds' => array_map(fn (Membre $m) => $m->getId(), $this->getParticipants()),
        ];
    }
}
