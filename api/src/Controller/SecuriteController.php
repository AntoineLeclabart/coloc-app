<?php

namespace App\Controller;

use App\Dto\MotDePasseInput;
use App\Entity\Reglage;
use App\Repository\ReglageRepository;
use App\Security\ColocUserProvider;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\RememberMeBadge;
use Symfony\Component\Security\Http\Event\LogoutEvent;

class SecuriteController extends AbstractController
{
    /** Atteint seulement quand json_login a accepté le mot de passe. */
    #[Route('/api/login', methods: ['POST'])]
    public function login(): JsonResponse
    {
        return $this->json(['connecte' => true]);
    }

    /** Permet au front de savoir s'il est connecté (401 sinon). */
    #[Route('/api/session', methods: ['GET'])]
    public function session(): JsonResponse
    {
        return $this->json(['connecte' => true]);
    }

    /**
     * Change le mot de passe partagé. Les autres appareils sont déconnectés
     * (leur cookie « rester connecté » dépend du mot de passe) ; celui-ci
     * reste connecté.
     */
    #[Route('/api/mot-de-passe', methods: ['PUT'])]
    public function changerMotDePasse(
        #[MapRequestPayload] MotDePasseInput $input,
        UserPasswordHasherInterface $hasher,
        ReglageRepository $reglages,
        ColocUserProvider $comptes,
        Security $security,
    ): Response {
        $hash = $hasher->hashPassword($this->getUser(), $input->nouveau);
        $reglages->enregistrer(Reglage::MOT_DE_PASSE_HASH, $hash);

        $compte = $comptes->loadUserByIdentifier(ColocUserProvider::IDENTIFIANT);
        $security->login($compte, 'json_login', 'main', [new RememberMeBadge()]);

        return new Response(status: Response::HTTP_NO_CONTENT);
    }

    /** Pas de redirection après déconnexion : c'est une API. */
    #[AsEventListener]
    public function apresDeconnexion(LogoutEvent $event): void
    {
        $event->setResponse(new Response(status: Response::HTTP_NO_CONTENT));
    }
}
