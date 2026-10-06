<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261006201027 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Réglages modifiables depuis l\'appli (mot de passe de la coloc)';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE reglage (cle VARCHAR(50) NOT NULL, valeur CLOB NOT NULL, PRIMARY KEY (cle))');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP TABLE reglage');
    }
}
