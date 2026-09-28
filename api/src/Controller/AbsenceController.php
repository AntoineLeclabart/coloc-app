<?php

namespace App\Controller;

use App\Dto\AbsenceInput;
use App\Entity\Absence;
use App\Repository\AbsenceRepository;
use App\Repository\MembreRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/absences')]
class AbsenceController extends AbstractController
{
    public function __construct(private EntityManagerInterface $em)
    {
    }

    #[Route('', methods: ['GET'])]
    public function lister(AbsenceRepository $absences): JsonResponse
    {
        return $this->json($absences->findBy([], ['debut' => 'DESC']));
    }

    #[Route('', methods: ['POST'])]
    public function creer(#[MapRequestPayload] AbsenceInput $input, MembreRepository $membres): JsonResponse
    {
        $membre = $membres->find($input->membreId) ?? throw $this->createNotFoundException('Membre inconnu.');
        $absence = new Absence($membre, new \DateTimeImmutable($input->debut), new \DateTimeImmutable($input->fin));
        $this->em->persist($absence);
        $this->em->flush();

        return $this->json($absence, Response::HTTP_CREATED);
    }

    #[Route('/{id}', methods: ['DELETE'])]
    public function supprimer(Absence $absence): Response
    {
        $this->em->remove($absence);
        $this->em->flush();

        return new Response(status: Response::HTTP_NO_CONTENT);
    }
}
