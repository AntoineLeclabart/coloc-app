<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
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

    /** Pas de redirection après déconnexion : c'est une API. */
    #[AsEventListener]
    public function apresDeconnexion(LogoutEvent $event): void
    {
        $event->setResponse(new Response(status: Response::HTTP_NO_CONTENT));
    }
}
