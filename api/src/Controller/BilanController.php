<?php

namespace App\Controller;

use App\Service\Bilan;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

class BilanController extends AbstractController
{
    #[Route('/api/bilan/{mois}', methods: ['GET'], requirements: ['mois' => '\d{4}-(0[1-9]|1[0-2])'])]
    public function bilan(string $mois, Bilan $bilan): JsonResponse
    {
        return $this->json($bilan->calculer($mois));
    }
}
