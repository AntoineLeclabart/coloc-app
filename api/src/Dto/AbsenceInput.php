<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class AbsenceInput
{
    public function __construct(
        #[Assert\Positive]
        public int $membreId,
        #[Assert\Date]
        public string $debut,
        #[Assert\Date]
        #[Assert\GreaterThanOrEqual(propertyPath: 'debut', message: 'La fin doit être après le début.')]
        public string $fin,
    ) {
    }
}
