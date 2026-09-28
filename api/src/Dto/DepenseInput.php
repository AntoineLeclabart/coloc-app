<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class DepenseInput
{
    /**
     * @param int[] $participantIds vide = tout le monde
     */
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Length(max: 255)]
        public string $libelle,
        /** En centimes. */
        #[Assert\Positive]
        public int $montant,
        #[Assert\Positive]
        public int $payeurId,
        #[Assert\Positive]
        public int $categorieId,
        #[Assert\Date]
        public string $date,
        #[Assert\All([new Assert\Positive()])]
        public array $participantIds = [],
    ) {
    }
}
