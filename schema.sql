-- SQLite (un seul fichier, suffisant pour une coloc). Montants en centimes.
CREATE TABLE membre (
    id          INTEGER PRIMARY KEY,
    nom         TEXT NOT NULL UNIQUE,
    arrivee     TEXT,               -- date d'entrée dans la coloc (optionnel)
    depart      TEXT                -- date de départ (optionnel)
);

CREATE TABLE absence (
    id          INTEGER PRIMARY KEY,
    membre_id   INTEGER NOT NULL REFERENCES membre(id) ON DELETE CASCADE,
    debut       TEXT NOT NULL,      -- inclus, saisi à la semaine dans l'interface
    fin         TEXT NOT NULL,      -- inclus
    motif       TEXT
);

CREATE TABLE categorie (
    id          INTEGER PRIMARY KEY,
    nom         TEXT NOT NULL,      -- Loyer, Internet, Courses...
    type        TEXT NOT NULL CHECK (type IN ('fixe', 'variable'))
);

-- Poids par défaut d'une catégorie fixe (ex. grande chambre = 1.2). Absent = 1.
CREATE TABLE poids_categorie (
    categorie_id INTEGER NOT NULL REFERENCES categorie(id) ON DELETE CASCADE,
    membre_id    INTEGER NOT NULL REFERENCES membre(id) ON DELETE CASCADE,
    poids        REAL NOT NULL,
    PRIMARY KEY (categorie_id, membre_id)
);

CREATE TABLE depense (
    id           INTEGER PRIMARY KEY,
    libelle      TEXT NOT NULL,
    montant      INTEGER NOT NULL,  -- centimes
    payeur_id    INTEGER NOT NULL REFERENCES membre(id),
    categorie_id INTEGER NOT NULL REFERENCES categorie(id),
    date         TEXT NOT NULL,
    periode_debut TEXT,             -- période couverte ; par défaut le mois de la date
    periode_fin   TEXT
);

-- Participants d'une dépense quand ce n'est pas "tout le monde".
CREATE TABLE depense_participant (
    depense_id  INTEGER NOT NULL REFERENCES depense(id) ON DELETE CASCADE,
    membre_id   INTEGER NOT NULL REFERENCES membre(id),
    PRIMARY KEY (depense_id, membre_id)
);

-- Un remboursement est enregistré comme un virement entre deux membres.
CREATE TABLE remboursement (
    id          INTEGER PRIMARY KEY,
    de_id       INTEGER NOT NULL REFERENCES membre(id),
    a_id        INTEGER NOT NULL REFERENCES membre(id),
    montant     INTEGER NOT NULL,
    date        TEXT NOT NULL
);
