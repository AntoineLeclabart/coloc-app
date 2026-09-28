# Appli dépenses coloc : conception

## Règle de calcul

Deux types de catégories :

- **Fixe** (loyer, internet, assurance, abonnements) : partagée selon des poids fixes, 1 chacun par défaut (on peut mettre 1,2 pour une grande chambre). Les absences ne changent rien.
- **Variable** (courses, produits ménagers, électricité si vous voulez) : partagée **au prorata des jours de présence** sur la période que couvre la dépense.

Période d'une dépense variable : par défaut le mois de sa date (les courses du 15 novembre sont réparties selon les présences de tout novembre). On peut la préciser (ex. une facture d'électricité du 1er septembre au 31 octobre).

Absences : saisies à la semaine dans l'interface, stockées en dates de début et fin. Le calcul se fait au jour près, ce qui gère les semaines à cheval sur deux mois.

Cas limites :
- tout le monde absent sur la période : partage égal ;
- arrondis : au centime, sans centime perdu (méthode du plus fort reste) ;
- une dépense peut exclure certains membres (ex. un apéro à deux).

Remboursements : **un bilan à la fin de chaque mois**. On calcule le solde de chacun (payé moins dû), puis le plus gros débiteur rembourse le plus gros créancier, et ainsi de suite.

## Exemple chiffré

Alice, Bob et Chloé, période de 4 semaines. Bob est absent 2 semaines.

| Dépense | Type | Payé par | Alice | Bob | Chloé |
|---|---|---|---|---|---|
| Loyer 1 500 € | fixe | Alice | 500 | 500 | 500 |
| Internet 30 € | fixe | Bob | 10 | 10 | 10 |
| Courses 600 € | variable | Chloé | 240 | 120 | 240 |
| **Total dû** | | | 750 | 630 | 750 |
| **Payé** | | | 1 500 | 30 | 600 |
| **Solde** | | | +750 | −600 | −150 |

Courses : 4 + 2 + 4 = 10 semaines de présence, donc 60 € la semaine-personne. Bob ne paie que 2 semaines.

Remboursements : Bob verse 600 € à Alice, Chloé verse 150 € à Alice.

## Stack

- **API** (`api/`) : Symfony 8.1, Doctrine ORM, SQLite (un seul fichier `api/var/data_dev.db`). Le calcul est dans `api/src/Service/Calcul.php`, le bilan mensuel dans `api/src/Service/Bilan.php`.
- **Front** (`front/`) : Angular 21, composants standalone et signals. Écrans : Bilan, Dépenses, Absences, Réglages.
- **Docker** : `compose.yaml` à la racine lance l'API (port 8000) et le front (port 4200).

Voir le README pour lancer le projet.
