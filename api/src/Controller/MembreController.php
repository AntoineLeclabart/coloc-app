<?php

namespace App\Controller;

use App\Dto\MembreInput;
use App\Entity\Membre;
use App\Repository\MembreRepository;
use Doctrine\DBAL\Exception\ForeignKeyConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/membres')]
class MembreController extends AbstractController
{
    public function __construct(private EntityManagerInterface $em)
    {
    }

    #[Route('', methods: ['GET'])]
    public function lister(MembreRepository $membres): JsonResponse
    {
        return $this->json($membres->findBy([], ['nom' => 'ASC']));
    }

    #[Route('', methods: ['POST'])]
    public function creer(#[MapRequestPayload] MembreInput $input): JsonResponse
    {
        $membre = new Membre(trim($input->nom));
        $this->em->persist($membre);
        $this->em->flush();

        return $this->json($membre, Response::HTTP_CREATED);
    }

    #[Route('/{id}', methods: ['DELETE'])]
    public function supprimer(Membre $membre): Response
    {
        $this->em->remove($membre);
        try {
            $this->em->flush();
        } catch (ForeignKeyConstraintViolationException) {
            throw new ConflictHttpException('Ce coloc a des dépenses ou des remboursements.');
        }

        return new Response(status: Response::HTTP_NO_CONTENT);
    }
}
