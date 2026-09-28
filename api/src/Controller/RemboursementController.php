<?php

namespace App\Controller;

use App\Dto\RemboursementInput;
use App\Entity\Remboursement;
use App\Repository\MembreRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/remboursements')]
class RemboursementController extends AbstractController
{
    public function __construct(private EntityManagerInterface $em)
    {
    }

    #[Route('', methods: ['POST'])]
    public function creer(#[MapRequestPayload] RemboursementInput $input, MembreRepository $membres): JsonResponse
    {
        $de = $membres->find($input->deId) ?? throw $this->createNotFoundException('Membre inconnu.');
        $a = $membres->find($input->aId) ?? throw $this->createNotFoundException('Membre inconnu.');
        $remboursement = new Remboursement($de, $a, $input->montant, $input->mois);
        $this->em->persist($remboursement);
        $this->em->flush();

        return $this->json($remboursement, Response::HTTP_CREATED);
    }

    #[Route('/{id}', methods: ['DELETE'])]
    public function supprimer(Remboursement $remboursement): Response
    {
        $this->em->remove($remboursement);
        $this->em->flush();

        return new Response(status: Response::HTTP_NO_CONTENT);
    }
}
