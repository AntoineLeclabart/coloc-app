<?php

namespace App\Security;

use App\Entity\Reglage;
use App\Repository\ReglageRepository;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\Exception\UserNotFoundException;
use Symfony\Component\Security\Core\User\InMemoryUser;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Security\Core\User\UserProviderInterface;

/**
 * Un seul compte partagé par toute la coloc. Son mot de passe est celui
 * choisi dans les réglages, ou à défaut celui de COLOC_MOT_DE_PASSE_HASH.
 *
 * @implements UserProviderInterface<InMemoryUser>
 */
class ColocUserProvider implements UserProviderInterface
{
    public const IDENTIFIANT = 'coloc';

    public function __construct(
        private ReglageRepository $reglages,
        #[Autowire(env: 'COLOC_MOT_DE_PASSE_HASH')]
        private string $hashParDefaut,
    ) {
    }

    public function loadUserByIdentifier(string $identifier): InMemoryUser
    {
        if (self::IDENTIFIANT !== $identifier) {
            throw new UserNotFoundException();
        }
        $hash = $this->reglages->valeur(Reglage::MOT_DE_PASSE_HASH) ?? $this->hashParDefaut;

        return new InMemoryUser(self::IDENTIFIANT, $hash, ['ROLE_USER']);
    }

    public function refreshUser(UserInterface $user): InMemoryUser
    {
        if (!$user instanceof InMemoryUser) {
            throw new UnsupportedUserException();
        }

        return $this->loadUserByIdentifier($user->getUserIdentifier());
    }

    public function supportsClass(string $class): bool
    {
        return InMemoryUser::class === $class;
    }
}
