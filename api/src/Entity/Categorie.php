<?php

namespace App\Entity;

use App\Repository\CategorieRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CategorieRepository::class)]
class Categorie implements \JsonSerializable
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    /**
     * @param array<int, float> $poids membreId => poids, pour les catégories fixes (1 par défaut)
     */
    public function __construct(
        #[ORM\Column(length: 100)]
        private string $nom,
        #[ORM\Column(enumType: TypeCategorie::class)]
        private TypeCategorie $type,
        #[ORM\Column(type: 'json')]
        private array $poids = [],
    ) {
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getNom(): string
    {
        return $this->nom;
    }

    public function getType(): TypeCategorie
    {
        return $this->type;
    }

    /** @return array<int, float> */
    public function getPoids(): array
    {
        return $this->poids;
    }

    /** @param array<int, float> $poids */
    public function modifier(string $nom, TypeCategorie $type, array $poids): void
    {
        $this->nom = $nom;
        $this->type = $type;
        $this->poids = $poids;
    }

    public function jsonSerialize(): array
    {
        return [
            'id' => $this->id,
            'nom' => $this->nom,
            'type' => $this->type->value,
            'poids' => (object) $this->poids,
        ];
    }
}
