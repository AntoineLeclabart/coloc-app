<?php

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class SecuriteTest extends WebTestCase
{
    private KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = ApiTestCase::creerClientAvecBaseNeuve();
    }

    public function testSansConnexionLApiRepond401(): void
    {
        $this->client->request('GET', '/api/membres');
        $this->assertResponseStatusCodeSame(401);
    }

    public function testMauvaisMotDePasse(): void
    {
        $this->connexion('faux');
        $this->assertResponseStatusCodeSame(401);
    }

    public function testConnexionPuisDeconnexion(): void
    {
        // Mot de passe par défaut défini dans .env.
        $this->connexion('coloc');
        $this->assertResponseIsSuccessful();
        $this->assertBrowserHasCookie('REMEMBERME');

        $this->client->request('GET', '/api/session');
        $this->assertResponseIsSuccessful();

        $this->client->request('POST', '/api/logout');
        $this->assertResponseStatusCodeSame(204);
        $this->client->request('GET', '/api/session');
        $this->assertResponseStatusCodeSame(401);
    }

    public function testChangerLeMotDePasse(): void
    {
        // Un autre appareil connecté avec l'ancien mot de passe.
        $this->connexion('coloc');
        $ancienCookie = $this->client->getCookieJar()->get('REMEMBERME');

        $this->client->jsonRequest('PUT', '/api/mot-de-passe', ['actuel' => 'coloc', 'nouveau' => 'nouveau-secret']);
        $this->assertResponseStatusCodeSame(204);

        // Cet appareil reste connecté, avec un nouveau cookie.
        $this->client->request('GET', '/api/session');
        $this->assertResponseIsSuccessful();
        $this->assertNotSame($ancienCookie->getValue(), $this->client->getCookieJar()->get('REMEMBERME')->getValue());

        // L'autre appareil est déconnecté.
        $this->client->getCookieJar()->clear();
        $this->client->getCookieJar()->set($ancienCookie);
        $this->client->request('GET', '/api/session');
        $this->assertResponseStatusCodeSame(401);

        $this->connexion('coloc');
        $this->assertResponseStatusCodeSame(401);
        $this->connexion('nouveau-secret');
        $this->assertResponseIsSuccessful();
    }

    public function testChangerLeMotDePasseExigeLActuel(): void
    {
        $this->connexion('coloc');
        $this->client->jsonRequest('PUT', '/api/mot-de-passe', ['actuel' => 'faux', 'nouveau' => 'nouveau-secret']);
        $this->assertResponseStatusCodeSame(422);
        $this->assertStringContainsString('Mot de passe actuel incorrect.', $this->client->getResponse()->getContent());

        $this->client->jsonRequest('PUT', '/api/mot-de-passe', ['actuel' => 'coloc', 'nouveau' => 'court']);
        $this->assertResponseStatusCodeSame(422);

        $this->client->getCookieJar()->clear();
        $this->connexion('coloc');
        $this->assertResponseIsSuccessful();
    }

    public function testChangerLeMotDePasseSansConnexion(): void
    {
        $this->client->jsonRequest('PUT', '/api/mot-de-passe', ['actuel' => 'coloc', 'nouveau' => 'nouveau-secret']);
        $this->assertResponseStatusCodeSame(401);
    }

    private function connexion(string $motDePasse): void
    {
        $this->client->jsonRequest('POST', '/api/login', ['username' => 'coloc', 'password' => $motDePasse]);
    }
}
