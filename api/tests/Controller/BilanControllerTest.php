<?php

namespace App\Tests\Controller;

use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class BilanControllerTest extends WebTestCase
{
    private KernelBrowser $client;

    protected function setUp(): void
    {
        // Base SQLite neuve pour chaque test.
        @unlink(\dirname(__DIR__, 2).'/var/data_test.db');
        $this->client = static::createClient();
        $em = static::getContainer()->get(EntityManagerInterface::class);
        (new SchemaTool($em))->createSchema($em->getMetadataFactory()->getAllMetadata());
    }

    private function post(string $url, array $data): array
    {
        $this->client->jsonRequest('POST', $url, $data);
        $this->assertResponseStatusCodeSame(201, (string) $this->client->getResponse()->getContent());

        return json_decode($this->client->getResponse()->getContent(), true);
    }

    public function testBilanDuMoisAvecAbsenceEtRemboursement(): void
    {
        $alice = $this->post('/api/membres', ['nom' => 'Alice'])['id'];
        $bob = $this->post('/api/membres', ['nom' => 'Bob'])['id'];
        $chloe = $this->post('/api/membres', ['nom' => 'Chloé'])['id'];
        $loyer = $this->post('/api/categories', ['nom' => 'Loyer', 'type' => 'fixe'])['id'];
        $courses = $this->post('/api/categories', ['nom' => 'Courses', 'type' => 'variable'])['id'];

        // Février 2026 : 4 semaines pile. Bob absent 2 semaines.
        $this->post('/api/absences', ['membreId' => $bob, 'debut' => '2026-02-09', 'fin' => '2026-02-22']);
        $this->post('/api/depenses', ['libelle' => 'Loyer', 'montant' => 150000, 'payeurId' => $alice, 'categorieId' => $loyer, 'date' => '2026-02-01']);
        $this->post('/api/depenses', ['libelle' => 'Courses', 'montant' => 60000, 'payeurId' => $chloe, 'categorieId' => $courses, 'date' => '2026-02-15']);
        // Dépense de mars : ne doit pas compter.
        $this->post('/api/depenses', ['libelle' => 'Loyer mars', 'montant' => 150000, 'payeurId' => $bob, 'categorieId' => $loyer, 'date' => '2026-03-01']);

        $this->client->request('GET', '/api/bilan/2026-02');
        $this->assertResponseIsSuccessful();
        $bilan = json_decode($this->client->getResponse()->getContent(), true);

        // Loyer 500 chacun ; courses 240 / 120 / 240 (Bob présent 14 jours sur 28).
        $this->assertSame([$alice => 76000, $bob => -62000, $chloe => -14000], $bilan['soldes']);
        $this->assertSame([
            ['deId' => $bob, 'aId' => $alice, 'montant' => 62000],
            ['deId' => $chloe, 'aId' => $alice, 'montant' => 14000],
        ], $bilan['virements']);

        // Bob rembourse : il ne reste que Chloé.
        $this->post('/api/remboursements', ['deId' => $bob, 'aId' => $alice, 'montant' => 62000, 'mois' => '2026-02']);
        $this->client->request('GET', '/api/bilan/2026-02');
        $bilan = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertSame([['deId' => $chloe, 'aId' => $alice, 'montant' => 14000]], $bilan['virements']);
    }

    public function testOnNeSupprimePasUnColocQuiADesDepenses(): void
    {
        $alice = $this->post('/api/membres', ['nom' => 'Alice'])['id'];
        $loyer = $this->post('/api/categories', ['nom' => 'Loyer', 'type' => 'fixe'])['id'];
        $this->post('/api/depenses', ['libelle' => 'Loyer', 'montant' => 1000, 'payeurId' => $alice, 'categorieId' => $loyer, 'date' => '2026-02-01']);

        $this->client->request('DELETE', '/api/membres/'.$alice);
        $this->assertResponseStatusCodeSame(409);
        $this->client->request('DELETE', '/api/categories/'.$loyer);
        $this->assertResponseStatusCodeSame(409);
    }

    public function testPoidsDUneCategorieFixe(): void
    {
        $alice = $this->post('/api/membres', ['nom' => 'Alice'])['id'];
        $bob = $this->post('/api/membres', ['nom' => 'Bob'])['id'];
        $loyer = $this->post('/api/categories', ['nom' => 'Loyer', 'type' => 'fixe', 'poids' => [(string) $alice => 2]])['id'];
        $this->post('/api/depenses', ['libelle' => 'Loyer', 'montant' => 90000, 'payeurId' => $bob, 'categorieId' => $loyer, 'date' => '2026-02-01']);

        $this->client->request('GET', '/api/bilan/2026-02');
        $bilan = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertSame([(string) $alice => 60000, (string) $bob => 30000], $bilan['depenses'][0]['parts']);
    }

    public function testValidation(): void
    {
        $this->client->jsonRequest('POST', '/api/categories', ['nom' => 'X', 'type' => 'autre']);
        $this->assertResponseStatusCodeSame(422);
    }
}
