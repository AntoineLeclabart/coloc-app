<?php

namespace App\Tests\Controller;

use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

abstract class ApiTestCase extends WebTestCase
{
    protected KernelBrowser $client;

    protected function setUp(): void
    {
        // Base SQLite neuve pour chaque test.
        @unlink(\dirname(__DIR__, 2).'/var/data_test.db');
        $this->client = static::createClient();
        $em = static::getContainer()->get(EntityManagerInterface::class);
        (new SchemaTool($em))->createSchema($em->getMetadataFactory()->getAllMetadata());
        $coloc = static::getContainer()->get('security.user.provider.concrete.coloc')->loadUserByIdentifier('coloc');
        $this->client->loginUser($coloc);
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
