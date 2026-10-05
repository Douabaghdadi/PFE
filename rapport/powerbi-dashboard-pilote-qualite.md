# Dashboard Power BI — Pilote Qualité (Qualinet)

Spécification complète : modèle de données, mesures DAX avancées et maquette des pages.

> **Référence DAX faisant foi : `powerbi-dax-avance.md`.** Ce document-ci décrit le modèle,
> les visuels et la mise en page. Trois formules ci-dessous ont été simplifiées à tort par
> rapport à `KPIService.java` (avancement planifié, taux de respect des échéances, signe de
> l'écart budget) : elles sont signalées sur place et corrigées dans le document dédié.
Les formules répliquent **à l'identique** la logique métier de `KPIService.java`, afin que le
rapport Power BI et l'application Angular affichent les mêmes chiffres.

---

## 0. Positionnement : ce que ce rapport apporte en plus de l'application

Qualinet couvre déjà deux besoins, et il ne faut surtout pas les redévelopper ici :

| Écran existant | Périmètre | Limite structurelle |
|---|---|---|
| `/pilote-qualite/dashboard` | Discipline de reporting sur tout le portefeuille : ponctualité des dépôts, complétude, échéances | Ne juge **jamais** la performance d'un projet (choix assumé, documenté dans le composant) |
| `/pilote-qualite/projet-kpi/:id` | Performance complète d'**un** projet : avancement, budget, risques, score de santé, analyse IA | Route paramétrée par `id` : **un projet à la fois**, aucune comparaison possible |

Le trou fonctionnel est donc précis : **il n'existe aucune vue transversale de la
performance**. Le score de santé est calculé projet par projet, mais personne ne peut
répondre à :

- Quels sont mes 5 projets les plus critiques, tous chefs de projet confondus ?
- Le portefeuille se dégrade-t-il depuis six mois, ou est-ce une impression ?
- Les projets en sous-traitance dérivent-ils plus que les projets internes ?
- Quel facteur explique le mieux qu'un projet finisse en « CRITIQUE » ?

C'est le périmètre de ce rapport : **comparaison entre projets, évolution dans le temps,
segmentation par axe d'analyse**. Trois choses qu'une page mono-projet ne peut pas faire et
qu'il serait coûteux de recoder en Angular.

Quatre capacités natives de Power BI rendent cette valeur ajoutée démontrable en soutenance,
et aucune n'existe dans l'application :

1. **Influenceurs clés** — Power BI calcule seul les facteurs corrélés à un score dégradé.
2. **Décomposition arborescente** — exploration libre, sans chemin programmé à l'avance.
3. **Prévision intégrée** — extrapolation d'une courbe avec intervalle de confiance.
4. **Filtrage croisé universel** — cliquer n'importe quel élément refiltre toute la page.

> **Réponse à l'objection « c'est la même chose que mes pages existantes »** : les *mesures*
> sont volontairement identiques — c'est la garantie de cohérence. Ce sont les *questions
> posées* qui diffèrent. L'application pilote un projet ; le rapport pilote un portefeuille.

---

## 1. Modèle cible (schéma en étoile)

```
                    ┌──────────────┐
                    │   DimDate    │
                    └──────┬───────┘
                           │ 1
                 ┌─────────┴──────────┐
                 │ *                  │ *
        ┌────────▼────────┐   ┌───────▼────────┐
        │  fiches_projet   │1─*│  fiches_suivi   │1─*┐
        └────────┬────────┘   └───────┬────────┘   │
                 │ *                  │ 1          │
        ┌────────▼────────┐           │      ┌─────▼─────┐
        │  DimChefProjet  │           │      │  Taches   │
        └─────────────────┘           │      └───────────┘
        ┌─────────────────┐           ├──────┤ Problemes │
        │   DimStatut     │1────────* │      ├───────────┤
        └─────────────────┘           └──────┤  Risques  │
                                             └───────────┘
```

**Relations à créer** (vue Modèle) :

| De | Vers | Cardinalité | Sens du filtre |
|---|---|---|---|
| `fiches_projet[_id]` | `fiches_suivi[ficheProjetId]` | 1 → * | Simple |
| `fiches_suivi[_id]` | `Taches[ficheSuiviId]` | 1 → * | Simple |
| `fiches_suivi[_id]` | `Problemes[ficheSuiviId]` | 1 → * | Simple |
| `fiches_suivi[_id]` | `Risques[ficheSuiviId]` | 1 → * | Simple |
| `DimStatut[code]` | `fiches_projet[statut]` | 1 → * | Simple |
| `DimChefProjet[_id]` | `fiches_projet[chefProjetId]` | 1 → * | Simple |
| `DimDate[Date]` | `fiches_suivi[dateRapport]` | 1 → * | Simple (**active**) |
| `DimDate[Date]` | `fiches_projet[dateProchaineFicheSuivi]` | 1 → * | **Inactive** (`USERELATIONSHIP`) |

---

## 2. Préparation Power Query

### 2.1 Requêtes à décharger
Clic droit → décocher *Activer le chargement* sur : `password_reset_tokens`, `notifications`,
`historique_modifications` (sauf si tu veux la page d'audit), `roles`.

### 2.2 `fiches_projet`
Supprime les colonnes texte longues (`presentation`, `historique`, `perimetre`,
`risquesPotentiels`, `preRequis`, `objectifs`, `description`) : elles alourdissent le modèle
sans alimenter un seul visuel. Développe le Record `estimationBudget` → `budgetMDHT`, `total`.
Force le type **Date** sur toutes les colonnes de date (les `LocalDate` Mongo arrivent en texte ISO).

### 2.3 `Taches` — la table de faits centrale
Nouvelle requête → *Requête vide* → *Éditeur avancé* → colle :

```m
let
    Source     = fiches_suivi,
    Garde      = Table.SelectColumns(Source, {"_id", "ficheProjetId", "dateRapport", "tachesSuivi"}),
    Renomme    = Table.RenameColumns(Garde, {{"_id", "ficheSuiviId"}}),
    Deplie     = Table.ExpandListColumn(Renomme, "tachesSuivi"),
    Champs     = Table.ExpandRecordColumn(Deplie, "tachesSuivi",
        {"code","sujet","livrable","assigneA","debut","echeance","tempsEstime",
         "dateDebutReelle","dateFinReelle","tempsPasse","pourcentageRealise","statut","estTitre"},
        {"code","sujet","livrable","assigneA","debut","echeance","tempsEstime",
         "dateDebutReelle","dateFinReelle","tempsPasse","pourcentageRealise","statut","estTitre"}),

    // Réplique tachesEffectives() : on exclut les lignes de titre et les lignes vides
    SansTitres = Table.SelectRows(Champs, each [estTitre] <> true),
    SansVides  = Table.SelectRows(SansTitres, each not (
                     ([sujet]     = null or [sujet]     = "") and
                     ([code]      = null or [code]      = "") and
                     ([livrable]  = null or [livrable]  = ""))),

    Types      = Table.TransformColumnTypes(SansVides, {
                     {"debut", type date}, {"echeance", type date},
                     {"dateDebutReelle", type date}, {"dateFinReelle", type date},
                     {"tempsEstime", type number}, {"tempsPasse", type number},
                     {"pourcentageRealise", type number}}),
    Cle        = Table.AddIndexColumn(Types, "TacheId", 1, 1, Int64.Type)
in
    Cle
```

### 2.4 `Problemes` et `Risques`
Même principe, sur les listes de `constatGlobal`. Ces deux tables rendent le score qualité
**exact** (détection des problèmes persistants d'une fiche à l'autre).

```m
let
    Source  = fiches_suivi,
    Garde   = Table.SelectColumns(Source, {"_id", "ficheProjetId", "dateRapport", "constatGlobal"}),
    Renomme = Table.RenameColumns(Garde, {{"_id", "ficheSuiviId"}}),
    Constat = Table.ExpandRecordColumn(Renomme, "constatGlobal",
                  {"problemesRencontres"}, {"liste"}),
    Deplie  = Table.ExpandListColumn(Constat, "liste"),
    Propre  = Table.SelectRows(Deplie, each [liste] <> null and Text.Trim([liste]) <> ""),
    Final   = Table.RenameColumns(Propre, {{"liste", "libelle"}})
in
    Final
```
> Duplique cette requête en remplaçant `problemesRencontres` par `principauxRisques`
> (table `Risques`) puis par `recommandations` (table `Recommandations`).

### 2.5 `fiches_suivi`
Développe `ficheSignaletique.financier` → `budgetPrevision`, `budgetRealisation`, `ecart`,
et `constatGlobal.etatAvancement`. Ajoute les compteurs :

```m
Table.AddColumn(Etape, "nbRisques",         each List.Count([constatGlobal][principauxRisques]   ?? {}), Int64.Type)
Table.AddColumn(Etape, "nbProblemes",       each List.Count([constatGlobal][problemesRencontres] ?? {}), Int64.Type)
Table.AddColumn(Etape, "nbRecommandations", each List.Count([constatGlobal][recommandations]     ?? {}), Int64.Type)
```

### 2.6 Dimensions
- `DimStatut` : référence `nomenclatures`, filtre `type = "STATUT"` → codes `EN_COURS`, `TERMINE`, `EN_ATTENTE`, `ANNULE`.
- `DimCategorie` : idem avec `type = "CATEGORIE_PROJET"`.
- `DimChefProjet` : référence `users`, garde `_id`, `nom`, `prenom`, `email`, `role`.

---

## 3. Table de dates

```dax
DimDate =
VAR Debut = DATE( YEAR( MIN( fiches_projet[dateDebut] ) ), 1, 1 )
VAR Fin   = DATE( YEAR( MAX( fiches_projet[dateFinPrevue] ) ) + 1, 12, 31 )
RETURN
ADDCOLUMNS(
    CALENDAR( Debut, Fin ),
    "Annee",       YEAR( [Date] ),
    "NumMois",     MONTH( [Date] ),
    "Mois",        FORMAT( [Date], "MMM" ),
    "AnneeMois",   FORMAT( [Date], "YYYY-MM" ),
    "Trimestre",   "T" & QUARTER( [Date] ),
    "AnneeTrim",   YEAR( [Date] ) & " T" & QUARTER( [Date] ),
    "EstPasse",    [Date] <= TODAY()
)
```
Trie `Mois` par `NumMois`, puis clic droit sur la table → **Marquer comme table de dates**.

---

## 4. Colonnes calculées

### 4.1 Sur `fiches_suivi`
```dax
-- Isole la dernière fiche de chaque projet : c'est elle qui porte l'état courant,
-- exactement comme derniereSuivi dans KPIService.
EstDerniereFiche =
VAR dMax =
    CALCULATE( MAX( fiches_suivi[dateRapport] ),
               ALLEXCEPT( fiches_suivi, fiches_suivi[ficheProjetId] ) )
VAR idMax =
    CALCULATE( MAX( fiches_suivi[_id] ),
               ALLEXCEPT( fiches_suivi, fiches_suivi[ficheProjetId] ),
               fiches_suivi[dateRapport] = dMax )
RETURN
    IF( fiches_suivi[dateRapport] = dMax && fiches_suivi[_id] = idMax, 1, 0 )
```

### 4.2 Sur `Taches`
```dax
EstDerniereFiche = RELATED( fiches_suivi[EstDerniereFiche] )

-- Réplique pourcentageTache() : le pourcentage saisi prime, le statut sert de repli.
PctTache =
VAR p = Taches[pourcentageRealise]
VAR s = Taches[statut] & ""
RETURN
    IF( NOT ISBLANK( p ),
        MIN( 100, MAX( 0, p ) ),
        SWITCH( TRUE(),
            CONTAINSSTRING( s, "termin" ) ||
            CONTAINSSTRING( s, "clotur" ) ||
            CONTAINSSTRING( s, "achev" ),    100,
            CONTAINSSTRING( s, "en cours" ),  50,
            0 ) )

-- Réplique poidsTache() : une tâche sans charge estimée pèse 1.
PoidsTache = IF( COALESCE( Taches[tempsEstime], 0 ) > 0, Taches[tempsEstime], 1 )

-- Earned Value : la part de charge estimée déjà « gagnée ».
ValeurAcquiseTache = COALESCE( Taches[tempsEstime], 0 ) * Taches[PctTache] / 100
```

### 4.3 Sur `fiches_projet`
```dax
-- Réplique estClos()
EstClos =
VAR s = fiches_projet[statut] & ""
RETURN
    CONTAINSSTRING( s, "TERMIN" ) || CONTAINSSTRING( s, "CLOTUR" ) || CONTAINSSTRING( s, "ANNUL" )

-- Retard de dépôt de la fiche de suivi périodique (métier du pilote qualité)
JoursRetardFiche =
IF( NOT ISBLANK( fiches_projet[dateProchaineFicheSuivi] )
        && NOT fiches_projet[EstClos]
        && fiches_projet[dateProchaineFicheSuivi] < TODAY(),
    DATEDIFF( fiches_projet[dateProchaineFicheSuivi], TODAY(), DAY ),
    0 )

-- Retard d'exécution sur la date de fin prévue (métier projet)
JoursRetardProjet =
IF( NOT ISBLANK( fiches_projet[dateFinPrevue] )
        && NOT fiches_projet[EstClos]
        && fiches_projet[dateFinPrevue] < TODAY(),
    DATEDIFF( fiches_projet[dateFinPrevue], TODAY(), DAY ),
    0 )

-- Bandes de sévérité alignées sur severite() du dashboard Angular
Sévérité retard =
SWITCH( TRUE(),
    fiches_projet[JoursRetardFiche] = 0,   "Conforme",
    fiches_projet[JoursRetardFiche] <= 30, "Modéré",
    fiches_projet[JoursRetardFiche] <= 60, "Élevé",
    "Critique" )

Conformité =
SWITCH( TRUE(),
    ISBLANK( fiches_projet[dateDerniereFicheSuivi] ), "Jamais suivi",
    fiches_projet[JoursRetardFiche] > 0,              "En retard",
    "À jour" )
```

---

## 5. Mesures DAX

Crée une table vide (*Entrer des données* → nomme-la `_Mesures`, une colonne bidon à masquer)
et range-y tout ce qui suit. Le classement se fait via la propriété *Dossier d'affichage*.

### 5.1 Volumétrie
```dax
Nb Projets        = DISTINCTCOUNT( fiches_projet[_id] )
Nb Projets actifs = CALCULATE( [Nb Projets], fiches_projet[EstClos] = FALSE() )
Nb Fiches Suivi   = COUNTROWS( fiches_suivi )
Nb Tâches         = CALCULATE( COUNTROWS( Taches ), Taches[EstDerniereFiche] = 1 )
```

### 5.2 Conformité du suivi — le cœur du rôle pilote qualité
```dax
Projets jamais suivis =
CALCULATE( [Nb Projets], ISBLANK( fiches_projet[dateDerniereFicheSuivi] ) )

Projets en retard de fiche =
CALCULATE( [Nb Projets], fiches_projet[JoursRetardFiche] > 0 )

Projets à jour = [Nb Projets] - [Projets en retard de fiche] - [Projets jamais suivis]

Taux de conformité = DIVIDE( [Projets à jour], [Nb Projets] )

Total jours de retard = SUMX( fiches_projet, fiches_projet[JoursRetardFiche] )

Pire retard (j) = MAXX( fiches_projet, fiches_projet[JoursRetardFiche] )

Retard moyen (j) =
AVERAGEX( FILTER( fiches_projet, fiches_projet[JoursRetardFiche] > 0 ),
          fiches_projet[JoursRetardFiche] )

Ancienneté moyenne du dernier suivi (j) =
AVERAGEX(
    FILTER( fiches_projet, NOT ISBLANK( fiches_projet[dateDerniereFicheSuivi] ) ),
    DATEDIFF( fiches_projet[dateDerniereFicheSuivi], TODAY(), DAY ) )

-- Fiches attendues dans les 30 prochains jours : le pilote anticipe au lieu de subir.
Fiches attendues 30 j =
CALCULATE(
    [Nb Projets],
    FILTER( fiches_projet,
        NOT ISBLANK( fiches_projet[dateProchaineFicheSuivi] )
        && fiches_projet[dateProchaineFicheSuivi] >= TODAY()
        && fiches_projet[dateProchaineFicheSuivi] <= TODAY() + 30 ) )

-- Évolution : compare le taux de conformité au mois précédent.
Taux de conformité M-1 =
CALCULATE( [Taux de conformité], DATEADD( DimDate[Date], -1, MONTH ) )

Δ Conformité = [Taux de conformité] - [Taux de conformité M-1]

-- KPI textuel prêt à poser dans une carte
Libellé conformité =
VAR t = [Taux de conformité]
RETURN
    FORMAT( t, "0 %" ) & " — " &
    SWITCH( TRUE(), t >= 0.9, "maîtrisé", t >= 0.7, "à surveiller", "dégradé" )
```

### 5.3 Avancement et valeur acquise (EVM)
```dax
-- Réplique avancementPondere() : moyenne pondérée par la charge estimée.
Avancement réel % =
VAR T = FILTER( Taches, Taches[EstDerniereFiche] = 1 )
RETURN
    DIVIDE( SUMX( T, Taches[PoidsTache] * Taches[PctTache] ),
            SUMX( T, Taches[PoidsTache] ) )

-- ⚠ Version incomplète : le début de tâche est facultatif (repli sur la date de début
-- du projet), et il manque le repli avancementPlanifieProjet() quand aucune tâche n'a
-- d'échéance. Formule exacte : powerbi-dax-avance.md §6.2.
-- Réplique avancementPlanifie() : avancement attendu à ce jour, déduit de la
-- fenêtre début → échéance de chaque tâche.
Avancement planifié % =
VAR T =
    FILTER( Taches,
        Taches[EstDerniereFiche] = 1
        && NOT ISBLANK( Taches[debut] )
        && NOT ISBLANK( Taches[echeance] ) )
VAR Num =
    SUMX( T,
        VAR d      = Taches[debut]
        VAR f      = Taches[echeance]
        VAR total  = DATEDIFF( d, f, DAY )
        VAR ecoule = DATEDIFF( d, TODAY(), DAY )
        VAR pct =
            SWITCH( TRUE(),
                TODAY() < d,  0,
                TODAY() >= f, 100,
                DIVIDE( ecoule, total ) * 100 )
        RETURN Taches[PoidsTache] * pct )
VAR Den = SUMX( T, Taches[PoidsTache] )
RETURN DIVIDE( Num, Den )

Écart planning (pts) = [Avancement réel %] - [Avancement planifié %]

-- SPI > 1 : en avance. SPI < 1 : dérive du planning.
SPI = DIVIDE( [Avancement réel %], [Avancement planifié %] )

Charge estimée (j)   = CALCULATE( SUM( Taches[tempsEstime] ),        Taches[EstDerniereFiche] = 1 )
Charge consommée (j) = CALCULATE( SUM( Taches[tempsPasse] ),         Taches[EstDerniereFiche] = 1 )
Valeur acquise (j)   = CALCULATE( SUM( Taches[ValeurAcquiseTache] ), Taches[EstDerniereFiche] = 1 )

Charge restante (j) = MAX( 0, [Charge estimée (j)] - [Valeur acquise (j)] )

Taux consommation charge = DIVIDE( [Charge consommée (j)], [Charge estimée (j)] )

-- CPI (indiceEfficacite) > 1 : le travail coûte moins que prévu.
CPI = DIVIDE( [Valeur acquise (j)], [Charge consommée (j)] )

-- Projection de fin extrapolée de la vélocité observée (réplique projeterDateDeFin).
Date de fin projetée =
VAR Debut  = MIN( fiches_projet[dateDebut] )
VAR Pct    = [Avancement réel %]
VAR Ecoule = DATEDIFF( Debut, TODAY(), DAY )
RETURN
    IF( Pct > 0 && NOT ISBLANK( Debut ),
        Debut + DIVIDE( Ecoule, Pct / 100 ) )

Dérive projetée (j) =
VAR Projetee = [Date de fin projetée]
VAR Prevue   = MIN( fiches_projet[dateFinPrevue] )
RETURN IF( NOT ISBLANK( Projetee ) && NOT ISBLANK( Prevue ),
           DATEDIFF( Prevue, Projetee, DAY ) )
```

### 5.4 Respect des échéances
```dax
Tâches terminées =
CALCULATE( COUNTROWS( Taches ), Taches[EstDerniereFiche] = 1, Taches[PctTache] >= 100 )

Tâches en cours =
CALCULATE( COUNTROWS( Taches ), Taches[EstDerniereFiche] = 1,
           Taches[PctTache] > 0, Taches[PctTache] < 100 )

Tâches non démarrées =
CALCULATE( COUNTROWS( Taches ), Taches[EstDerniereFiche] = 1, Taches[PctTache] = 0 )

Tâches en retard =
CALCULATE( COUNTROWS( Taches ),
    FILTER( Taches,
        Taches[EstDerniereFiche] = 1
        && Taches[PctTache] < 100
        && NOT ISBLANK( Taches[echeance] )
        && Taches[echeance] < TODAY() ) )

-- HORIZON_ECHEANCE_JOURS = 14 dans KPIService
Tâches échéance proche =
CALCULATE( COUNTROWS( Taches ),
    FILTER( Taches,
        Taches[EstDerniereFiche] = 1
        && Taches[PctTache] < 100
        && NOT ISBLANK( Taches[echeance] )
        && Taches[echeance] >= TODAY()
        && Taches[echeance] <= TODAY() + 14 ) )

-- ⚠ Une tâche terminée SANS dateFinReelle doit sortir du dénominateur (le respect n'est
-- pas démontrable). Formule exacte : powerbi-dax-avance.md §8.
Taux respect échéances =
VAR Evaluables =
    FILTER( Taches,
        Taches[EstDerniereFiche] = 1
        && NOT ISBLANK( Taches[echeance] )
        && ( Taches[PctTache] >= 100 || Taches[echeance] < TODAY() ) )
VAR Respectees =
    FILTER( Evaluables,
        Taches[PctTache] >= 100
        && NOT ISBLANK( Taches[dateFinReelle] )
        && Taches[dateFinReelle] <= Taches[echeance] )
RETURN DIVIDE( COUNTROWS( Respectees ), COUNTROWS( Evaluables ) )
```

### 5.5 Budget
```dax
Budget prévu   = CALCULATE( SUM( fiches_suivi[budgetPrevision] ),   fiches_suivi[EstDerniereFiche] = 1 )
Budget réalisé = CALCULATE( SUM( fiches_suivi[budgetRealisation] ), fiches_suivi[EstDerniereFiche] = 1 )

-- Corrigé : remplirBudget() calcule prevision - realisation.
-- Un écart POSITIF signifie qu'il reste du budget, pas qu'on a dépassé.
Écart budget = [Budget prévu] - [Budget réalisé]

Taux consommation budget = DIVIDE( [Budget réalisé], [Budget prévu] )

-- Le signal de dérive : consommer plus vite qu'on n'avance.
Dérive budgétaire (pts) = [Taux consommation budget] * 100 - [Avancement réel %]

Projets en dérive budgétaire =
CALCULATE( [Nb Projets], FILTER( VALUES( fiches_projet[_id] ), [Dérive budgétaire (pts)] > 10 ) )
```

### 5.6 Qualité et risques
```dax
Nb Problèmes       = CALCULATE( SUM( fiches_suivi[nbProblemes] ),       fiches_suivi[EstDerniereFiche] = 1 )
Nb Risques         = CALCULATE( SUM( fiches_suivi[nbRisques] ),         fiches_suivi[EstDerniereFiche] = 1 )
Nb Recommandations = CALCULATE( SUM( fiches_suivi[nbRecommandations] ), fiches_suivi[EstDerniereFiche] = 1 )

-- Un problème qui revient d'une fiche à l'autre : le vrai signal qualité.
-- Réplique compterProblemesPersistants() par intersection de deux jeux de libellés.
Nb Problèmes persistants =
VAR DerniereDate = CALCULATE( MAX( fiches_suivi[dateRapport] ), fiches_suivi[EstDerniereFiche] = 1 )
VAR PrecDate     = CALCULATE( MAX( fiches_suivi[dateRapport] ), fiches_suivi[dateRapport] < DerniereDate )
VAR ListeActuelle =
    CALCULATETABLE( VALUES( Problemes[libelle] ), fiches_suivi[dateRapport] = DerniereDate )
VAR ListePrecedente =
    CALCULATETABLE( VALUES( Problemes[libelle] ), fiches_suivi[dateRapport] = PrecDate )
RETURN
    COALESCE( COUNTROWS( INTERSECT( ListeActuelle, ListePrecedente ) ), 0 )

-- Risque documenté mais sans plan d'action : ce que le pilote qualité doit traquer.
Projets à risque non couvert =
CALCULATE( [Nb Projets],
    FILTER( VALUES( fiches_projet[_id] ),
        [Nb Risques] > 0 && [Nb Recommandations] = 0 ) )
```

### 5.7 Score de santé — la pièce maîtresse
Réplique exacte des 4 composantes de `remplirScoreSante()` (30 + 25 + 25 + 20 = 100 points).

```dax
-- Composante 1 (30 pts) : avancement réel rapporté à l'avancement planifié.
Score avancement =
VAR Planifie = [Avancement planifié %]
VAR Reel     = [Avancement réel %]
RETURN
    IF( Planifie > 0,
        MIN( DIVIDE( Reel, Planifie ), 1 ) * 30,   -- plafonné : être en avance ne sur-note pas
        DIVIDE( Reel, 100 ) * 30 )                 -- planning inexploitable : avancement brut

-- Composante 2 (25 pts) : retard projet (max -15) + tâches hors délai (max -10).
Score délais =
VAR Retard   = SUMX( fiches_projet, fiches_projet[JoursRetardProjet] )
VAR Penalite = MIN( 15, DIVIDE( Retard, 2 ) ) + MIN( 10, [Tâches en retard] * 2.5 )
RETURN MAX( 0, 25 - Penalite )

-- Composante 3 (25 pts) : ne pénalise pas la transparence, mais l'inaction.
-- Un problème qui traîne coûte 3 pts, un problème nouveau 1 pt.
-- Un risque couvert par une recommandation coûte 1 pt, sinon 2,5 pts.
Score qualité =
VAR Persistants = MIN( [Nb Problèmes persistants], [Nb Problèmes] )
VAR Nouveaux    = [Nb Problèmes] - Persistants
VAR PoidsRisque = IF( [Nb Recommandations] > 0, 1.0, 2.5 )
VAR Penalite    = MIN( 15, Persistants * 3 + Nouveaux * 1 )
                + MIN( 10, [Nb Risques] * PoidsRisque )
RETURN MAX( 0, 25 - Penalite )

-- Composante 4 (20 pts) : charge (12 pts via le CPI) + budget (8 pts via la dérive).
-- Donnée non renseignée = note neutre à 60 %, ni bonus ni sanction.
Score maîtrise =
VAR VoletCharge =
    IF( [Charge consommée (j)] > 0, MIN( [CPI], 1 ) * 12, 12 * 0.6 )
VAR Derive = [Dérive budgétaire (pts)]
VAR VoletBudget =
    IF( [Budget prévu] > 0 && [Budget réalisé] > 0,
        IF( Derive <= 0, 8, MAX( 0, 8 - DIVIDE( Derive, 5 ) ) ),
        8 * 0.6 )
RETURN VoletCharge + VoletBudget

Score de santé =
MIN( 100, MAX( 0,
    ROUND( [Score avancement], 1 ) + ROUND( [Score délais],   1 )
  + ROUND( [Score qualité],    1 ) + ROUND( [Score maîtrise], 1 ) ) )

Niveau de santé =
SWITCH( TRUE(),
    [Score de santé] >= 80, "EXCELLENT",
    [Score de santé] >= 60, "BON",
    [Score de santé] >= 40, "ATTENTION",
    "CRITIQUE" )

-- Au niveau portefeuille, il faut moyenner projet par projet : une somme n'a aucun sens.
Score de santé portefeuille =
AVERAGEX( VALUES( fiches_projet[_id] ), [Score de santé] )

Projets critiques =
CALCULATE( [Nb Projets], FILTER( VALUES( fiches_projet[_id] ), [Score de santé] < 40 ) )

-- Couleur pilotée par mesure : Format → Couleur → fx → Valeur du champ.
Couleur santé =
SWITCH( TRUE(),
    [Score de santé] >= 80, "#10b981",
    [Score de santé] >= 60, "#3b82f6",
    [Score de santé] >= 40, "#f59e0b",
    "#ef4444" )

Couleur conformité =
VAR t = [Taux de conformité]
RETURN SWITCH( TRUE(), t >= 0.9, "#10b981", t >= 0.7, "#f59e0b", "#ef4444" )
```

### 5.8 Mesures de confort
```dax
-- Affiche un message au lieu d'un visuel vide quand un filtre ne ramène rien.
Message vide =
IF( [Nb Projets] = 0, "Aucun projet ne correspond aux filtres sélectionnés", "" )

-- Titre dynamique : Format → Titre → fx → Valeur du champ
Titre conformité =
"Conformité du suivi — " & [Nb Projets] & " projet(s) · " &
FORMAT( [Taux de conformité], "0 %" ) & " à jour"

-- Classement des projets les plus à risque, utilisable pour un Top N
Rang criticité =
RANKX( ALLSELECTED( fiches_projet[nomProjet] ), [Score de santé], , ASC, DENSE )
```

---

## 6. Maquette du dashboard — 3 pages + 1 drill-through

> **Règle de conception** : aucune page ne reproduit un écran existant de Qualinet.
> Chaque visuel doit répondre à une question que l'application ne sait pas traiter,
> parce qu'elle est mono-projet (`projet-kpi/:id`) ou mono-thématique (`dashboard`).

### Page 1 · Carte de santé du portefeuille
*Question : « lesquels de mes projets sont en difficulté, et pourquoi ? »*
*L'application calcule ce score projet par projet. Ici on les voit tous en même temps.*

| Visuel | Configuration | Ce que l'app ne sait pas faire |
|---|---|---|
| **Matrice de scoring** | Lignes `nomProjet` ; valeurs `Score de santé`, `Score avancement`, `Score délais`, `Score qualité`, `Score maîtrise`. Barres de données sur les composantes, arrière-plan par `Couleur santé`. Tri décroissant sur le score. | Le classement de N projets sur un score commun |
| **Nuage de points SPI × CPI** | X = `SPI`, Y = `CPI`, taille = `Charge estimée (j)`, détails = `nomProjet`, couleur = `Niveau de santé`. Une **ligne de constante** à 1 sur chaque axe → 4 quadrants : *sain / en retard mais rentable / rapide mais coûteux / en dérive*. | Corréler deux indices sur tout le portefeuille |
| **Décomposition arborescente** | Analyser `Score de santé portefeuille`, expliquer par `DimCategorie[libelle]` → `typeProjet` → `modaliteDeveloppement` → `DimChefProjet[nom]`. Le visuel choisit lui-même l'axe le plus discriminant. | Exploration libre, non programmée à l'avance |
| **Cartes** | `Projets critiques`, `Projets en dérive budgétaire`, `Projets à risque non couvert`, `Score de santé portefeuille` | Agrégats transversaux |
| **Jauge** | `Score de santé portefeuille`, min 0, max 100, cible 70 | — |

### Page 2 · Trajectoire du portefeuille
*Question : « est-ce que ça s'améliore ou est-ce que ça se dégrade ? »*
*L'application montre l'instant présent. Ici on montre la pente.*

| Visuel | Configuration |
|---|---|
| **Courbe** | Axe `DimDate[AnneeMois]`, valeur `Score de santé portefeuille` — la trajectoire qualité sur toute la période |
| **Courbe + colonnes** | Axe `DimDate[AnneeMois]`, colonnes `Nb Fiches Suivi`, courbe `Taux de conformité` (axe secondaire) : le volume de reporting explique-t-il la conformité ? |
| **KPI** | Valeur `Taux de conformité`, axe `DimDate[AnneeMois]`, cible `0,9`, avec `Δ Conformité` en variation |
| **Petits multiples** | Courbe `Avancement réel %` par `DimDate[AnneeMois]`, petits multiples sur `nomProjet` : 12 mini-courbes d'un coup d'œil |
| **Ruban** | Axe `DimDate[AnneeMois]`, valeur `Score de santé`, série `nomProjet` : qui monte, qui descend dans le classement |
| **Prévision** | Sur la courbe du score portefeuille : *Analytique → Prévision*, 3 périodes, intervalle de confiance 95 % |

### Page 3 · Analyse par axe
*Question : « quel facteur structurel explique nos dérives ? »*
*Analyse comparative que l'application ne propose sur aucun axe.*

| Visuel | Configuration |
|---|---|
| **Influenceurs clés** | Analyser `Niveau de santé` = "CRITIQUE", expliquer par `modaliteDeveloppement`, `typeProjet`, `caractereProjet`, `DimCategorie[libelle]`, `dureeEnMois`, `DimChefProjet[nom]`. Power BI calcule lui-même les facteurs corrélés — c'est du machine learning intégré, un vrai point fort en soutenance. |
| **Barres empilées** | Axe `DimChefProjet[nom]`, valeurs `Projets à jour` / `Projets en retard de fiche` / `Projets jamais suivis` |
| **Barres groupées** | Axe `modaliteDeveloppement` (interne / ST / CO / co-traitance), valeurs `CPI` et `SPI` : quelle modalité tient ses engagements ? |
| **Nuage de points** | X = `Avancement réel %`, Y = `Taux consommation budget` × 100, ligne de constante diagonale : tout point au-dessus consomme plus vite qu'il n'avance |
| **Cascade** | Axe `nomProjet`, valeur `Écart budget` : où part l'argent |
| **Tableau** | `designationClient`, `Nb Projets`, `Score de santé portefeuille`, `Taux respect échéances` : quels clients sont les plus exigeants en pilotage |

**Segments communs aux 3 pages** (panneau latéral synchronisé) : `DimDate[Annee]`,
`DimStatut[libelle]`, `DimChefProjet[nom]`, `DimCategorie[libelle]`, `typeProjet`.
*Affichage → Synchroniser les segments* pour les partager entre pages.

### Page 4 · Détail projet (drill-through)
Masque la page (clic droit sur l'onglet → *Masquer*). Dans le volet *Filtres*, glisse
`fiches_projet[nomProjet]` dans **Extraire**. Depuis n'importe quel visuel, clic droit sur un
projet → *Extraire*.

Cette page assume un recouvrement partiel avec `projet-kpi/:id` : c'est le point de sortie
naturel d'une exploration. Mais elle s'arrête au constat chiffré et pose un **bouton
« Analyser dans Qualinet »** (*Insérer → Bouton → Action : Lien web* vers
`http://localhost:4200/pilote-qualite/projet-kpi/<id>`) qui renvoie vers l'application pour
l'analyse IA et les actions correctives. La complémentarité devient visible dans le produit,
pas seulement dans le discours.

---

## 7. Thème Power BI

*Affichage → Thèmes → Personnaliser le thème actuel → Parcourir*. Crée `qualinet-theme.json` :

```json
{
  "name": "Qualinet",
  "dataColors": ["#2563eb","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#64748b"],
  "background": "#FFFFFF",
  "foreground": "#1e293b",
  "tableAccent": "#2563eb",
  "good": "#10b981",
  "neutral": "#f59e0b",
  "bad": "#ef4444",
  "textClasses": {
    "title":  { "fontSize": 14, "fontFace": "Segoe UI Semibold", "color": "#1e293b" },
    "header": { "fontSize": 12, "fontFace": "Segoe UI Semibold", "color": "#334155" },
    "label":  { "fontSize": 10, "fontFace": "Segoe UI",          "color": "#64748b" }
  },
  "visualStyles": {
    "*": { "*": {
      "background": [{ "show": true, "color": { "solid": { "color": "#FFFFFF" } } }],
      "border":     [{ "show": true, "color": { "solid": { "color": "#e2e8f0" } }, "radius": 8 }],
      "dropShadow": [{ "show": true, "preset": "BottomRight" }]
    }}
  }
}
```
Ces couleurs sont celles de ton application Angular : le rapport et l'app se lisent comme un
seul produit.

---

## 8. Sécurité au niveau des lignes (RLS)

*Modélisation → Gérer les rôles*. Deux rôles :

| Rôle | Table | Expression DAX |
|---|---|---|
| `PiloteQualite` | — | aucun filtre : vue portefeuille complète |
| `ChefProjet` | `fiches_projet` | `[chefProjetId] = LOOKUPVALUE( DimChefProjet[_id], DimChefProjet[email], USERPRINCIPALNAME() )` |

Teste avec *Afficher en tant que rôle*. C'est le pendant Power BI du contrôle d'accès par
rôle déjà en place côté Spring Security — à citer dans le chapitre sécurité du mémoire.

---

## 9. Points à anticiper pour la soutenance

**Actualisation des données.** Un import ODBC MongoDB en local ne se rafraîchit pas depuis
Power BI Service sans passerelle de données. Pour la démo, l'import figé suffit : mentionne la
limite et la solution (*On-premises data gateway*) dans le rapport — un jury apprécie une
limite assumée.

**Intégration dans Qualinet.** *Fichier → Incorporer le rapport → Site web ou portail*, puis
place l'iframe dans un composant Angular protégé par le garde de rôle pilote qualité. En
production on passerait par *Power BI Embedded* avec un jeton généré côté Spring Boot :
à citer comme perspective d'évolution.

**« Pourquoi Power BI alors que votre application calcule déjà ces KPI ? »** La question
viendra, prépare-la. Réponse en trois temps : *(1)* les pages existantes sont mono-projet
(`projet-kpi/:id`) ou limitées à la discipline de reporting (`dashboard`) — aucune ne compare
les projets entre eux ni n'analyse l'évolution dans le temps ; *(2)* le rapport réutilise
exactement les mêmes formules métier, il n'invente pas un second référentiel ; *(3)* il ouvre
des capacités analytiques que recoder en Angular serait disproportionné : influenceurs clés,
décomposition arborescente, prévision, filtrage croisé libre. Fais la démonstration en direct
sur le visuel *Influenceurs clés* : c'est l'argument qui se passe de commentaire.

**Cohérence des chiffres.** Prépare une diapositive qui met côte à côte le KPI de l'application
et celui de Power BI sur le même projet. Les formules de ce document sont dérivées de
`KPIService.java` : les valeurs doivent coïncider. C'est la démonstration qu'il n'y a qu'une
seule vérité métier, exprimée dans deux technologies.

**Checklist avant export du `.pbix`**
- [ ] Colonnes inutiles supprimées, requêtes techniques déchargées
- [ ] Toutes les relations en cardinalité 1 → * et sens de filtre unique
- [ ] `DimDate` marquée comme table de dates
- [ ] Mesures rangées dans `_Mesures` avec dossiers d'affichage
- [ ] Formats appliqués (% sans décimale, jours en entier, devise sur le budget)
- [ ] Titres et info-bulles renseignés sur chaque visuel
- [ ] Interactions entre visuels vérifiées (*Format → Modifier les interactions*)
- [ ] Navigation entre pages par boutons, drill-through testé
- [ ] Rendu contrôlé en 1280 × 720 (*Ajuster à la page*)
