<?php

namespace App\Dto;

use Symfony\Component\Security\Core\Validator\Constraints\UserPassword;
use Symfony\Component\Validator\Constraints as Assert;

final readonly class MotDePasseInput
{
    public function __construct(
        #[UserPassword(message: 'Mot de passe actuel incorrect.')]
        public string $actuel,
        #[Assert\NotBlank]
        #[Assert\Length(min: 6, max: 4096, minMessage: 'Au moins {{ limit }} caractères.')]
        public string $nouveau,
    ) {
    }
}
