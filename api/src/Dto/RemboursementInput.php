<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class RemboursementInput
{
    public function __construct(
        #[Assert\Positive]
        public int $deId,
        #[Assert\Positive]
        #[Assert\NotEqualTo(propertyPath: 'deId', message: 'On ne se rembourse pas soi-même.')]
        public int $aId,
        /** En centimes. */
        #[Assert\Positive]
        public int $montant,
        #[Assert\Regex('/^\d{4}-(0[1-9]|1[0-2])$/')]
        public string $mois,
    ) {
    }
}
