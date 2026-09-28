<?php

namespace App\Controller;

use App\Dto\CategorieInput;
use App\Entity\Categorie;
use App\Entity\TypeCategorie;
use App\Repository\CategorieRepository;
use Doctrine\DBAL\Exception\ForeignKeyConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/categories')]
class CategorieController extends AbstractController
{
    public function __construct(private EntityManagerInterface $em)
    {
    }

    #[Route('', methods: ['GET'])]
    public function lister(CategorieRepository $categories): JsonResponse
    {
        return $this->json($categories->findBy([], ['nom' => 'ASC']));
    }

    #[Route('', methods: ['POST'])]
    public function creer(#[MapRequestPayload] CategorieInput $input): JsonResponse
    {
        $categorie = new Categorie(trim($input->nom), TypeCategorie::from($input->type), self::poids($input));
        $this->em->persist($categorie);
        $this->em->flush();

        return $this->json($categorie, Response::HTTP_CREATED);
    }

    #[Route('/{id}', methods: ['PUT'])]
    public function modifier(Categorie $categorie, #[MapRequestPayload] CategorieInput $input): JsonResponse
    {
        $categorie->modifier(trim($input->nom), TypeCategorie::from($input->type), self::poids($input));
        $this->em->flush();

        return $this->json($categorie);
    }

    #[Route('/{id}', methods: ['DELETE'])]
    public function supprimer(Categorie $categorie): Response
    {
        $this->em->remove($categorie);
        try {
            $this->em->flush();
        } catch (ForeignKeyConstraintViolationException) {
            throw new ConflictHttpException('Des dépenses utilisent cette catégorie.');
        }

        return new Response(status: Response::HTTP_NO_CONTENT);
    }

    /** @return array<int, float> */
    private static function poids(CategorieInput $input): array
    {
        return array_map('floatval', $input->poids);
    }
}
