<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class CategorieInput
{
    /**
     * @param array<int, float> $poids membreId => poids (catégories fixes)
     */
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Length(max: 100)]
        public string $nom,
        #[Assert\Choice(choices: ['fixe', 'variable'])]
        public string $type,
        #[Assert\All([new Assert\Type('numeric'), new Assert\PositiveOrZero()])]
        public array $poids = [],
    ) {
    }
}
