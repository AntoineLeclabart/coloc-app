<?php

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class SecuriteTest extends WebTestCase
{
    public function testSansConnexionLApiRepond401(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/membres');
        $this->assertResponseStatusCodeSame(401);
    }

    public function testMauvaisMotDePasse(): void
    {
        $client = static::createClient();
        $client->jsonRequest('POST', '/api/login', ['username' => 'coloc', 'password' => 'faux']);
        $this->assertResponseStatusCodeSame(401);
    }

    public function testConnexionPuisDeconnexion(): void
    {
        $client = static::createClient();
        // Mot de passe par défaut défini dans .env.
        $client->jsonRequest('POST', '/api/login', ['username' => 'coloc', 'password' => 'coloc']);
        $this->assertResponseIsSuccessful();
        $this->assertBrowserHasCookie('REMEMBERME');

        $client->request('GET', '/api/session');
        $this->assertResponseIsSuccessful();

        $client->request('POST', '/api/logout');
        $this->assertResponseStatusCodeSame(204);
        $client->request('GET', '/api/session');
        $this->assertResponseStatusCodeSame(401);
    }
}
