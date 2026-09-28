<?php

namespace App\Controller;

use App\Dto\DepenseInput;
use App\Entity\Depense;
use App\Repository\CategorieRepository;
use App\Repository\DepenseRepository;
use App\Repository\MembreRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapQueryParameter;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/depenses')]
class DepenseController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        private MembreRepository $membres,
        private CategorieRepository $categories,
    ) {
    }

    #[Route('', methods: ['GET'])]
    public function lister(DepenseRepository $depenses, #[MapQueryParameter(filter: \FILTER_VALIDATE_REGEXP, options: ['regexp' => '/^\d{4}-\d{2}$/'])] string $mois): JsonResponse
    {
        return $this->json($depenses->findByMois($mois));
    }

    #[Route('', methods: ['POST'])]
    public function creer(#[MapRequestPayload] DepenseInput $input): JsonResponse
    {
        $depense = new Depense(...$this->valeurs($input));
        $this->em->persist($depense);
        $this->em->flush();

        return $this->json($depense, Response::HTTP_CREATED);
    }

    #[Route('/{id}', methods: ['PUT'])]
    public function modifier(Depense $depense, #[MapRequestPayload] DepenseInput $input): JsonResponse
    {
        $depense->modifier(...$this->valeurs($input));
        $this->em->flush();

        return $this->json($depense);
    }

    #[Route('/{id}', methods: ['DELETE'])]
    public function supprimer(Depense $depense): Response
    {
        $this->em->remove($depense);
        $this->em->flush();

        return new Response(status: Response::HTTP_NO_CONTENT);
    }

    /** Arguments de Depense::__construct() et Depense::modifier(). */
    private function valeurs(DepenseInput $input): array
    {
        $payeur = $this->membres->find($input->payeurId) ?? throw $this->createNotFoundException('Payeur inconnu.');
        $categorie = $this->categories->find($input->categorieId) ?? throw $this->createNotFoundException('Catégorie inconnue.');
        $participants = $input->participantIds ? $this->membres->findBy(['id' => $input->participantIds]) : [];

        return [trim($input->libelle), $input->montant, $payeur, $categorie, new \DateTimeImmutable($input->date), $participants];
    }
}
