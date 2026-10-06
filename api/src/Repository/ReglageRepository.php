<?php

namespace App\Repository;

use App\Entity\Reglage;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Reglage>
 */
class ReglageRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Reglage::class);
    }

    public function valeur(string $cle): ?string
    {
        return $this->find($cle)?->getValeur();
    }

    public function enregistrer(string $cle, string $valeur): void
    {
        $reglage = $this->find($cle);
        if ($reglage) {
            $reglage->setValeur($valeur);
        } else {
            $this->getEntityManager()->persist(new Reglage($cle, $valeur));
        }
        $this->getEntityManager()->flush();
    }
}
