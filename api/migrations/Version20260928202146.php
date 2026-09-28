<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260928202146 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE absence (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, debut DATE NOT NULL, fin DATE NOT NULL, membre_id INTEGER NOT NULL, CONSTRAINT FK_765AE0C96A99F74A FOREIGN KEY (membre_id) REFERENCES membre (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE)');
        $this->addSql('CREATE INDEX IDX_765AE0C96A99F74A ON absence (membre_id)');
        $this->addSql('CREATE TABLE categorie (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, nom VARCHAR(100) NOT NULL, type VARCHAR(255) NOT NULL, poids CLOB NOT NULL)');
        $this->addSql('CREATE TABLE depense (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, libelle VARCHAR(255) NOT NULL, montant INTEGER NOT NULL, date DATE NOT NULL, payeur_id INTEGER NOT NULL, categorie_id INTEGER NOT NULL, CONSTRAINT FK_34059757422667C5 FOREIGN KEY (payeur_id) REFERENCES membre (id) NOT DEFERRABLE INITIALLY IMMEDIATE, CONSTRAINT FK_34059757BCF5E72D FOREIGN KEY (categorie_id) REFERENCES categorie (id) NOT DEFERRABLE INITIALLY IMMEDIATE)');
        $this->addSql('CREATE INDEX IDX_34059757422667C5 ON depense (payeur_id)');
        $this->addSql('CREATE INDEX IDX_34059757BCF5E72D ON depense (categorie_id)');
        $this->addSql('CREATE TABLE depense_membre (depense_id INTEGER NOT NULL, membre_id INTEGER NOT NULL, PRIMARY KEY (depense_id, membre_id), CONSTRAINT FK_5E3F0DEE41D81563 FOREIGN KEY (depense_id) REFERENCES depense (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE, CONSTRAINT FK_5E3F0DEE6A99F74A FOREIGN KEY (membre_id) REFERENCES membre (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE)');
        $this->addSql('CREATE INDEX IDX_5E3F0DEE41D81563 ON depense_membre (depense_id)');
        $this->addSql('CREATE INDEX IDX_5E3F0DEE6A99F74A ON depense_membre (membre_id)');
        $this->addSql('CREATE TABLE membre (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, nom VARCHAR(100) NOT NULL)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_F6B4FB296C6E55B5 ON membre (nom)');
        $this->addSql('CREATE TABLE remboursement (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, montant INTEGER NOT NULL, mois VARCHAR(7) NOT NULL, de_id INTEGER NOT NULL, a_id INTEGER NOT NULL, CONSTRAINT FK_C0C0D9EF3F683D83 FOREIGN KEY (de_id) REFERENCES membre (id) NOT DEFERRABLE INITIALLY IMMEDIATE, CONSTRAINT FK_C0C0D9EF3BDE5358 FOREIGN KEY (a_id) REFERENCES membre (id) NOT DEFERRABLE INITIALLY IMMEDIATE)');
        $this->addSql('CREATE INDEX IDX_C0C0D9EF3F683D83 ON remboursement (de_id)');
        $this->addSql('CREATE INDEX IDX_C0C0D9EF3BDE5358 ON remboursement (a_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP TABLE absence');
        $this->addSql('DROP TABLE categorie');
        $this->addSql('DROP TABLE depense');
        $this->addSql('DROP TABLE depense_membre');
        $this->addSql('DROP TABLE membre');
        $this->addSql('DROP TABLE remboursement');
    }
}
