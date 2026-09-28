<?php

namespace App\Repository;

use App\Entity\Depense;
use Doctrine\DBAL\Types\Types;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<Depense> */
class DepenseRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Depense::class);
    }

    /** @return Depense[] */
    public function findByMois(string $mois): array
    {
        $debut = new \DateTimeImmutable($mois.'-01');

        return $this->createQueryBuilder('d')
            ->where('d.date >= :debut AND d.date < :fin')
            ->setParameter('debut', $debut, Types::DATE_IMMUTABLE)
            ->setParameter('fin', $debut->modify('first day of next month'), Types::DATE_IMMUTABLE)
            ->orderBy('d.date', 'DESC')
            ->getQuery()
            ->getResult();
    }
}
