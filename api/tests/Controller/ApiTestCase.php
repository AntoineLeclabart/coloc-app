<?php

namespace App\Tests\Controller;

use App\Security\ColocUserProvider;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

abstract class ApiTestCase extends WebTestCase
{
    protected KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = static::creerClientAvecBaseNeuve();
        $coloc = static::getContainer()->get(ColocUserProvider::class)->loadUserByIdentifier('coloc');
        $this->client->loginUser($coloc);
    }

    /** Client de test avec une base SQLite neuve. */
    public static function creerClientAvecBaseNeuve(): KernelBrowser
    {
        @unlink(\dirname(__DIR__, 2).'/var/data_test.db');
        $client = static::createClient();
        $em = static::getContainer()->get(EntityManagerInterface::class);
        (new SchemaTool($em))->createSchema($em->getMetadataFactory()->getAllMetadata());

        return $client;
    }

    protected function post(string $url, array $data): array
    {
        $this->client->jsonRequest('POST', $url, $data);
        $this->assertResponseStatusCodeSame(201, (string) $this->client->getResponse()->getContent());

        return json_decode($this->client->getResponse()->getContent(), true);
    }

    protected function get(string $url): array
    {
        $this->client->request('GET', $url);
        $this->assertResponseIsSuccessful();

        return json_decode($this->client->getResponse()->getContent(), true);
    }
}
