<?php

namespace App\Service;

use App\Entity\Absence;
use App\Entity\Depense;
use App\Entity\Membre;
use App\Entity\Remboursement;
use App\Entity\TypeCategorie;
use App\Repository\AbsenceRepository;
use App\Repository\DepenseRepository;
use App\Repository\MembreRepository;
use App\Repository\RemboursementRepository;

/**
 * Bilan d'un mois : part de chacun sur chaque dépense, soldes,
 * remboursements déjà faits et virements restant à faire.
 */
class Bilan
{
    public function __construct(
        private MembreRepository $membres,
        private AbsenceRepository $absences,
        private DepenseRepository $depenses,
        private RemboursementRepository $remboursements,
    ) {
    }

    /** @param string $mois format AAAA-MM */
    public function calculer(string $mois): array
    {
        $membres = $this->membres->findAll();
        $ids = array_map(fn (Membre $m) => $m->getId(), $membres);

        $absences = [];
        foreach ($this->absences->findAll() as $a) {
            /* @var Absence $a */
            $absences[$a->getMembre()->getId()][] = [
                'debut' => $a->getDebut()->format('Y-m-d'),
                'fin' => $a->getFin()->format('Y-m-d'),
            ];
        }
        $calcul = new Calcul($ids, $absences);

        $debut = new \DateTimeImmutable($mois.'-01');
        $fin = $debut->modify('last day of this month');

        $lignes = [];
        $soldes = array_fill_keys($ids, 0);
        foreach ($this->depenses->findByMois($mois) as $d) {
            /* @var Depense $d */
            $categorie = $d->getCategorie();
            $participants = array_map(fn (Membre $m) => $m->getId(), $d->getParticipants()) ?: $ids;
            $parts = $calcul->parts([
                'montant' => $d->getMontant(),
                'type' => $categorie->getType()->value,
                'date' => $d->getDate()->format('Y-m-d'),
                'poids' => $categorie->getPoids(),
                'participants' => $participants,
            ]);
            $soldes[$d->getPayeur()->getId()] += $d->getMontant();
            foreach ($parts as $id => $part) {
                $soldes[$id] -= $part;
            }
            $lignes[] = [
                'depense' => $d,
                'type' => $categorie->getType()->value,
                'parts' => (object) $parts,
            ];
        }

        $restants = $soldes;
        $faits = $this->remboursements->findBy(['mois' => $mois]);
        foreach ($faits as $r) {
            /* @var Remboursement $r */
            $restants[$r->getDe()->getId()] += $r->getMontant();
            $restants[$r->getA()->getId()] -= $r->getMontant();
        }

        return [
            'mois' => $mois,
            'membres' => array_map(fn (Membre $m) => [
                'id' => $m->getId(),
                'nom' => $m->getNom(),
                'joursPresence' => $calcul->joursPresence($m->getId(), $debut->format('Y-m-d'), $fin->format('Y-m-d')),
            ], $membres),
            'joursDansLeMois' => (int) $fin->format('j'),
            'depenses' => $lignes,
            'totaux' => [
                TypeCategorie::Fixe->value => array_sum(array_map(fn ($l) => 'fixe' === $l['type'] ? $l['depense']->getMontant() : 0, $lignes)),
                TypeCategorie::Variable->value => array_sum(array_map(fn ($l) => 'variable' === $l['type'] ? $l['depense']->getMontant() : 0, $lignes)),
            ],
            'soldes' => (object) $soldes,
            'remboursements' => $faits,
            'soldesRestants' => (object) $restants,
            'virements' => array_map(fn ($v) => ['deId' => $v['de'], 'aId' => $v['a'], 'montant' => $v['montant']], Calcul::remboursements($restants)),
        ];
    }
}
