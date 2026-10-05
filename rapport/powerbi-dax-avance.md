# DAX avancé — réplication de KPIService.java dans Power BI

Ce document ne contient que du DAX. Il reprend, mesure par mesure, les calculs de
`KPIService.java` (868 lignes) pour que le rapport Power BI produise **les mêmes nombres**
que la page `/pilote-qualite/projet-kpi/:id` de l'application.

- Pour construire la page simple (conformité du suivi), va voir `powerbi-guide-simple.md`.
- Pour le modèle, les visuels et la mise en page, va voir `powerbi-dashboard-pilote-qualite.md`.
- **Ici, uniquement les formules**, avec pour chacune la ligne de Java qu'elle réplique.

Noms de tables utilisés : `fiches_projet`, `fiches_suivi` (tes collections MongoDB),
plus `taches`, `problemes`, `risques`, `recommandations` (créées en Power Query, section 1)
et `DimDate`.

> **Avertissement de périmètre.** Ces mesures sont conçues pour être lues **dans un
> contexte filtré sur un projet** (une ligne de matrice = un projet). Au niveau
> portefeuille, une somme n'a aucun sens : il faut moyenner projet par projet avec
> `AVERAGEX ( VALUES ( fiches_projet[_id] ), [...] )`. C'est le piège n°1 de la section 11.

---

## 1. Prérequis — les 4 tables à créer en Power Query

Les mesures avancées travaillent sur les **tâches** et sur les **listes du constat global**,
qui sont imbriquées dans `fiches_suivi`. Il faut les aplatir.

> **Ordre important.** Crée ces 4 requêtes **avant** de supprimer les colonnes `[Record]` /
> `[List]` de `fiches_suivi`. Si c'est déjà fait : clic droit sur `fiches_suivi` →
> **Dupliquer**, puis dans la copie supprime les étapes de suppression de colonnes avant
> d'appliquer le code ci-dessous.

### 1.0 Vérifie d'abord le format des champs imbriqués

Dans Power Query, clique une cellule de `fiches_suivi[tachesSuivi]` :

- **`[List]` / `[Record]`** → le code M ci-dessous fonctionne tel quel.
- **Texte JSON** → insère `Json.Document` avant de déplier : remplace
  `Deplie = Table.ExpandListColumn(Renomme, "tachesSuivi")` par
  `Decode = Table.TransformColumns(Renomme, {{"tachesSuivi", each try Json.Document(_) otherwise {}}})`
  puis déplie `Decode`. Même principe pour `constatGlobal` et `estimationBudget`.

### 1.1 `taches` — la table de faits centrale

`Accueil → Nouvelle source → Requête vide`, puis `Affichage → Éditeur avancé` :

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

    // tachesEffectives() : les lignes de titre sont des regroupements, pas du travail.
    SansTitres = Table.SelectRows(Champs, each [estTitre] <> true),
    // Une ligne sans sujet, ni code, ni livrable est une ligne vide de saisie.
    SansVides  = Table.SelectRows(SansTitres, each not (
                     ([sujet]    = null or [sujet]    = "") and
                     ([code]     = null or [code]     = "") and
                     ([livrable] = null or [livrable] = ""))),

    Types      = Table.TransformColumnTypes(SansVides, {
                     {"debut", type date}, {"echeance", type date},
                     {"dateDebutReelle", type date}, {"dateFinReelle", type date},
                     {"tempsEstime", type number}, {"tempsPasse", type number},
                     {"pourcentageRealise", type number}}),
    Cle        = Table.AddIndexColumn(Types, "TacheId", 1, 1, Int64.Type)
in
    Cle
```

Nomme la requête **`taches`**.

### 1.2 `problemes`, `risques`, `recommandations`

Même principe sur les listes de `constatGlobal` :

```m
let
    Source  = fiches_suivi,
    Garde   = Table.SelectColumns(Source, {"_id", "ficheProjetId", "constatGlobal"}),
    Renomme = Table.RenameColumns(Garde, {{"_id", "ficheSuiviId"}}),
    Constat = Table.ExpandRecordColumn(Renomme, "constatGlobal",
                  {"problemesRencontres"}, {"liste"}),
    Deplie  = Table.ExpandListColumn(Constat, "liste"),
    Propre  = Table.SelectRows(Deplie, each [liste] <> null and Text.Trim([liste]) <> ""),
    Final   = Table.RenameColumns(Propre, {{"liste", "libelle"}})
in
    Final
```

Duplique cette requête deux fois en remplaçant `problemesRencontres` par
`principauxRisques` (table **`risques`**) puis par `recommandations`
(table **`recommandations`**).

### 1.3 Colonnes à ajouter à `fiches_suivi`

Développe `ficheSignaletique.financier` et `constatGlobal` pour obtenir :

```
budgetPrevision, budgetRealisation, etatAvancement, dateCreation
```

`dateCreation` sert de date de repli — voir la section 2.

### 1.4 Colonne à ajouter à `fiches_projet`

`remplirBudget()` utilise `estimationBudget.budgetMDHT` comme budget de cadrage. C'est une
**chaîne de caractères** côté Java, parsée avec `Double.parseDouble` après nettoyage.
En Power Query, développe `estimationBudget` → `budgetMDHT`, puis colonne personnalisée :

```m
= try Number.FromText(Text.Select(Text.Replace([budgetMDHT], ",", "."), {"0".."9", ".", "-"}))
  otherwise 0
```

Nomme-la **`BudgetCadrage`**, type Nombre décimal.

### 1.5 Les relations à créer

| De | Vers | Cardinalité |
|---|---|---|
| `fiches_projet[ProjetId]` | `fiches_suivi[ficheProjetId]` | 1 → * |
| `fiches_suivi[_id]` | `taches[ficheSuiviId]` | 1 → * |
| `fiches_suivi[_id]` | `problemes[ficheSuiviId]` | 1 → * |
| `fiches_suivi[_id]` | `risques[ficheSuiviId]` | 1 → * |
| `fiches_suivi[_id]` | `recommandations[ficheSuiviId]` | 1 → * |
| `DimDate[Date]` | `fiches_suivi[dateRapport]` | 1 → * |

La chaîne `taches → fiches_suivi → fiches_projet` permet à `RELATED(fiches_projet[...])`
de remonter depuis une tâche : c'est ce qui rend possible le repli de la section 5.

> **`ProjetId`, pas `_id`.** Le connecteur livre les ObjectId sous la forme
> `{"$oid":"69c5cba7..."}` alors que `ficheProjetId` est une chaîne brute : il faut la
> colonne extraite décrite à l'étape 2 du guide simple. Les 4 autres relations, elles,
> rapprochent `fiches_suivi[_id]` de colonnes **issues de cette même colonne** (section 1.1) :
> quel que soit le format, les deux côtés sont identiques et la relation fonctionne.

---

## 2. Le principe fondateur : la dernière fiche fait foi

`calculateProjetKPIs()` trie les fiches puis ne garde que `derniereSuivi` pour tout ce qui
décrit l'état courant. **Aucune mesure d'état ne doit agréger l'historique**, sinon un projet
avec 5 fiches comptera 5 fois ses tâches.

### 2.1 La date de référence (`dateReference()`)

Le Java prend `dateRapport`, et à défaut `dateCreation`. Colonne calculée sur `fiches_suivi` :

```dax
DateRef = COALESCE ( fiches_suivi[dateRapport], DATEVALUE ( fiches_suivi[dateCreation] ) )
```

### 2.2 Isoler la dernière fiche

```dax
EstDerniereFiche =
VAR dMax =
    CALCULATE ( MAX ( fiches_suivi[DateRef] ),
                ALLEXCEPT ( fiches_suivi, fiches_suivi[ficheProjetId] ) )
VAR idMax =
    CALCULATE ( MAX ( fiches_suivi[_id] ),
                ALLEXCEPT ( fiches_suivi, fiches_suivi[ficheProjetId] ),
                fiches_suivi[DateRef] = dMax )
RETURN
    IF ( fiches_suivi[DateRef] = dMax && fiches_suivi[_id] = idMax, 1, 0 )
```

Le second `VAR` départage deux fiches déposées le même jour — sans lui, le projet aurait
deux « dernières fiches » et toutes les mesures d'état seraient doublées.

### 2.3 Isoler l'avant-dernière (pour les problèmes persistants)

```dax
EstAvantDerniere =
VAR dDerniere =
    CALCULATE ( MAX ( fiches_suivi[DateRef] ),
                ALLEXCEPT ( fiches_suivi, fiches_suivi[ficheProjetId] ) )
VAR dPrec =
    CALCULATE ( MAX ( fiches_suivi[DateRef] ),
                ALLEXCEPT ( fiches_suivi, fiches_suivi[ficheProjetId] ),
                fiches_suivi[DateRef] < dDerniere )
RETURN
    IF ( NOT ISBLANK ( dPrec ) && fiches_suivi[DateRef] = dPrec, 1, 0 )
```

### 2.4 Propager le marqueur sur les tâches

```dax
EstDerniereFiche = RELATED ( fiches_suivi[EstDerniereFiche] )
```
*(colonne calculée sur `taches`)*

---

## 3. Normaliser le texte — ce que tes données exigent vraiment

Le Java normalise avant toute comparaison : décapage des accents (`Normalizer.NFD`),
minuscules, `_` → espace. DAX n'a pas d'équivalent de `Normalizer`. Bonne nouvelle :
**tes données ne l'exigent quasiment nulle part.**

| Colonne | Valeurs réelles | Normalisation nécessaire |
|---|---|---|
| `fiches_projet[statut]` | `EN_COURS`, `TERMINE`, `EN_ATTENTE`, `ANNULE` | **aucune** — codes ASCII, comparaison exacte |
| `taches[statut]` | `En cours`, `Terminé`, `En retard`, `Bloqué` | **minuscules seulement** |
| `problemes[libelle]` | texte libre saisi à la main | minuscules + espaces |

Colonne calculée sur `taches` :

```dax
StatutNorm = TRIM ( LOWER ( COALESCE ( taches[statut], "" ) ) )
```

`CONTAINSSTRING ( "terminé", "termin" )` renvoie bien VRAI : l'accent tombe **après** le
motif cherché. Idem pour `bloqué` → `bloqu` et `en retard` → `retard`. Tant que la liste
déroulante du formulaire reste celle-ci, le décapage d'accents est inutile.

Colonne calculée sur `problemes` :

```dax
LibelleNorm = TRIM ( LOWER ( COALESCE ( problemes[libelle], "" ) ) )
```

> **Le jour où un statut sera saisi librement** (« Clôturé », « Achevé »), ajoute le
> décapage avant le `TRIM` :
> `SUBSTITUTE ( SUBSTITUTE ( s, "ô", "o" ), "é", "e" )`. Sans lui, « Clôturé » n'est pas
> reconnu comme terminé et la tâche reste comptée comme ouverte.

---

## 4. Colonnes calculées sur `taches`

### 4.1 `pourcentageTache()` — le pourcentage saisi prime, le statut sert de repli

```dax
PctTache =
VAR p = taches[pourcentageRealise]
VAR s = taches[StatutNorm]
RETURN
    IF (
        NOT ISBLANK ( p ),
        MIN ( 100, MAX ( 0, p ) ),
        SWITCH (
            TRUE (),
            CONTAINSSTRING ( s, "termin" )
                || CONTAINSSTRING ( s, "clotur" )
                || CONTAINSSTRING ( s, "achev" ), 100,
            CONTAINSSTRING ( s, "en cours" ),      50,
            0
        )
    )
```

### 4.2 `poidsTache()` — une tâche sans charge estimée pèse 1

```dax
PoidsTache = IF ( COALESCE ( taches[tempsEstime], 0 ) > 0, taches[tempsEstime], 1 )
```

Sans ce repli, une tâche non estimée aurait un poids nul et disparaîtrait de la moyenne
pondérée : l'avancement serait calculé sur une partie seulement du travail.

### 4.3 `estDemarree()` et `estEnRetardDeclare()`

```dax
EstDemarree =
NOT ISBLANK ( taches[dateDebutReelle] )
    || COALESCE ( taches[tempsPasse], 0 ) > 0
    || CONTAINSSTRING ( taches[StatutNorm], "en cours" )
    || CONTAINSSTRING ( taches[StatutNorm], "retard" )
    || CONTAINSSTRING ( taches[StatutNorm], "bloqu" )
```

```dax
EstEnRetardDeclare =
CONTAINSSTRING ( taches[StatutNorm], "retard" ) || CONTAINSSTRING ( taches[StatutNorm], "bloqu" )
```

### 4.4 `avancementPlanifieTache()` — l'avancement attendu à ce jour

C'est la formule la plus délicate du service, et celle que la première version du gros
document avait simplifiée à tort : **le début de la tâche est facultatif**, on retombe alors
sur la date de début du projet.

```dax
PlanifieTache =
VAR ech = taches[echeance]
VAR deb = COALESCE ( taches[debut], RELATED ( fiches_projet[dateDebut] ) )
RETURN
    IF (
        ISBLANK ( ech ),
        BLANK (),                                   -- tâche non planifiée : exclue du calcul
        IF (
            ISBLANK ( deb ) || deb >= ech,
            IF ( TODAY () < ech, 0, 100 ),          -- fenêtre inexploitable : tout ou rien
            IF (
                TODAY () <= deb, 0,
                IF (
                    TODAY () >= ech, 100,
                    DIVIDE ( INT ( TODAY () - deb ), INT ( ech - deb ) ) * 100
                )
            )
        )
    )
```

`BLANK()` et non `0` : une tâche sans échéance ne tire pas la moyenne vers le bas, elle
sort du calcul — c'est le `return null` du Java, suivi du `continue` dans la boucle.

### 4.5 Valeur acquise

```dax
ValeurAcquiseTache = COALESCE ( taches[tempsEstime], 0 ) * taches[PctTache] / 100
```

Noter la différence avec `PoidsTache` : ici, **pas** de repli à 1. Une tâche sans charge
estimée ne produit aucune valeur acquise, sinon le CPI serait faussé.

---

## 5. Colonnes calculées sur `fiches_projet`

### 5.1 `estClos()` — attention, ce n'est PAS le même test que la page conformité

Dans tes données, `statut` ne prend que 4 valeurs, toutes en ASCII majuscule :
`EN_COURS`, `TERMINE`, `EN_ATTENTE`, `ANNULE`. Les deux tests ci-dessous se ramènent donc
à la même écriture — mais garde-les distincts : ils divergeraient dès qu'un code
`CLOTURE` serait ajouté à la nomenclature par l'administrateur.

Le projet a **deux** notions de clôture dans ton code, et elles diffèrent :

| Méthode Java | Test | Utilisée pour |
|---|---|---|
| `getProjetsSuiviStatus()` | `statut.equals("TERMINE") \|\| statut.equals("ANNULE")` | le retard de dépôt de fiche |
| `KPIService.estClos()` | contient `termin`, `clotur` ou `annul` (normalisé) | les KPI de performance |

La seconde attrape aussi « Clôturé » et les variantes de casse. Utilise celle qui correspond
à la mesure que tu écris — ne les confonds pas.

```dax
EstClos = fiches_projet[statut] IN { "TERMINE", "ANNULE" }
```

> Version défensive, si la nomenclature devient libre :
> `EstClos = CONTAINSSTRING ( LOWER ( fiches_projet[statut] ), "termin" ) || CONTAINSSTRING ( LOWER ( fiches_projet[statut] ), "annul" ) || CONTAINSSTRING ( LOWER ( fiches_projet[statut] ), "clotur" )`

### 5.2 Retard sur la date de fin prévue

À ne pas confondre avec `JoursRetard` du guide simple, qui mesure le retard de **dépôt de
fiche**. Ici c'est le retard d'**exécution**.

```dax
JoursRetardProjet =
IF (
    NOT fiches_projet[EstClos]
        && NOT ISBLANK ( fiches_projet[dateFinPrevue] )
        && fiches_projet[dateFinPrevue] < TODAY (),
    DATEDIFF ( fiches_projet[dateFinPrevue], TODAY (), DAY ),
    0
)
```

---

## 6. Mesures — avancement, SPI et projection

### 6.1 Avancement réel (`avancementPondere()`)

```dax
Avancement réel % =
VAR T = CALCULATETABLE ( taches, taches[EstDerniereFiche] = 1 )
RETURN
    DIVIDE (
        SUMX ( T, taches[PoidsTache] * taches[PctTache] ),
        SUMX ( T, taches[PoidsTache] )
    )
```

### 6.2 Avancement planifié, **avec son repli projet**

Le Java essaie d'abord les tâches ; si aucune n'est exploitable (`-1`), il retombe sur la
fenêtre du projet. Il faut donc **trois** mesures, pas une.

```dax
Avancement planifié tâches % =
VAR T =
    CALCULATETABLE ( taches, taches[EstDerniereFiche] = 1, NOT ISBLANK ( taches[PlanifieTache] ) )
VAR Den = SUMX ( T, taches[PoidsTache] )
RETURN
    IF ( Den > 0, DIVIDE ( SUMX ( T, taches[PoidsTache] * taches[PlanifieTache] ), Den ) )
```

```dax
-- avancementPlanifieProjet() : le repli quand aucune tâche ne porte d'échéance.
Avancement planifié projet % =
VAR d = MIN ( fiches_projet[dateDebut] )
VAR f = MIN ( fiches_projet[dateFinPrevue] )
RETURN
    IF (
        ISBLANK ( d ) || ISBLANK ( f ) || d >= f, 0,
        IF (
            TODAY () <= d, 0,
            IF ( TODAY () >= f, 100, DIVIDE ( INT ( TODAY () - d ), INT ( f - d ) ) * 100 )
        )
    )
```

```dax
Avancement planifié % =
MAX ( 0, COALESCE ( [Avancement planifié tâches %], [Avancement planifié projet %] ) )
```

### 6.3 Écart et SPI

```dax
Écart planning (pts) = [Avancement réel %] - [Avancement planifié %]

-- SPI > 1 : en avance. SPI < 1 : dérive du planning. 0 quand le planning est inexploitable.
SPI = IF ( [Avancement planifié %] > 0, DIVIDE ( [Avancement réel %], [Avancement planifié %] ), 0 )
```

### 6.4 Projection de fin (`projeterDateDeFin()`)

```dax
Date de fin projetée =
VAR debut  = MIN ( fiches_projet[dateDebut] )
VAR pct    = [Avancement réel %]
VAR ecoule = INT ( TODAY () - debut )
VAR clos   = CALCULATE ( MAX ( fiches_projet[EstClos] ) )
RETURN
    IF (
        ISBLANK ( debut ) || debut >= TODAY () || clos = TRUE (),
        BLANK (),
        IF (
            pct >= 100, TODAY (),
            IF (
                pct <= 0,
                BLANK (),
                debut + MIN ( ROUND ( DIVIDE ( ecoule, pct / 100 ), 0 ), 3650 )
            )
        )
    )
```

Le plafond à **3650 jours** est la constante `PROJECTION_MAX_JOURS` : sans elle, un projet
avancé à 0,3 % projetterait sa fin en 2380 et le visuel deviendrait illisible.

```dax
Dérapage projeté (j) =
VAR projetee = [Date de fin projetée]
VAR prevue   = MIN ( fiches_projet[dateFinPrevue] )
RETURN
    IF ( NOT ISBLANK ( projetee ) && NOT ISBLANK ( prevue ), DATEDIFF ( prevue, projetee, DAY ) )
```

---

## 7. Mesures — charge et valeur acquise (EVM)

```dax
Charge estimée (j)   = CALCULATE ( SUM ( taches[tempsEstime] ),        taches[EstDerniereFiche] = 1 )
Charge consommée (j) = CALCULATE ( SUM ( taches[tempsPasse] ),         taches[EstDerniereFiche] = 1 )
Valeur acquise (j)   = CALCULATE ( SUM ( taches[ValeurAcquiseTache] ), taches[EstDerniereFiche] = 1 )

Charge restante (j) = MAX ( 0, [Charge estimée (j)] - [Valeur acquise (j)] )

Taux consommation charge = DIVIDE ( [Charge consommée (j)], [Charge estimée (j)] ) * 100

-- indiceEfficacite() : > 1, le travail produit plus qu'il ne consomme.
CPI = IF ( [Charge consommée (j)] > 0, DIVIDE ( [Valeur acquise (j)], [Charge consommée (j)] ), 0 )
```

---

## 8. Mesures — respect des échéances

```dax
Nb Tâches = CALCULATE ( COUNTROWS ( taches ), taches[EstDerniereFiche] = 1 )

Tâches terminées =
CALCULATE ( COUNTROWS ( taches ), taches[EstDerniereFiche] = 1, taches[PctTache] >= 100 )

-- Une tâche à 0 % mais démarrée (temps passé, date de début réelle, statut « bloqué »)
-- compte comme en cours : c'est le || estDemarree(tache) du Java.
Tâches en cours =
COUNTROWS (
    FILTER (
        CALCULATETABLE ( taches, taches[EstDerniereFiche] = 1 ),
        taches[PctTache] < 100 && ( taches[PctTache] > 0 || taches[EstDemarree] )
    )
)

Tâches non démarrées = [Nb Tâches] - [Tâches terminées] - [Tâches en cours]
```

```dax
-- Échéance dépassée, OU aucune échéance mais un statut qui déclare le retard.
Tâches en retard =
COUNTROWS (
    FILTER (
        CALCULATETABLE ( taches, taches[EstDerniereFiche] = 1 ),
        taches[PctTache] < 100
            && (
                ( NOT ISBLANK ( taches[echeance] ) && taches[echeance] < TODAY () )
                || ( ISBLANK ( taches[echeance] ) && taches[EstEnRetardDeclare] )
            )
    )
)
```

```dax
-- HORIZON_ECHEANCE_JOURS = 14
Tâches échéance proche =
COUNTROWS (
    FILTER (
        CALCULATETABLE ( taches, taches[EstDerniereFiche] = 1 ),
        taches[PctTache] < 100
            && NOT ISBLANK ( taches[echeance] )
            && taches[echeance] >= TODAY ()
            && taches[echeance] <= TODAY () + 14
    )
)
```

### Le taux de respect des échéances — la formule que le gros document avait fausse

`remplirTaches()` est explicite : *« sans date de fin réelle, le respect de l'échéance n'est
pas démontrable : la tâche sort du calcul plutôt que d'être présumée dans les temps »*. Une
tâche terminée **sans `dateFinReelle` n'entre donc pas au dénominateur**.

```dax
Taux respect échéances =
VAR T = CALCULATETABLE ( taches, taches[EstDerniereFiche] = 1 )
VAR Evaluables =
    FILTER (
        T,
        NOT ISBLANK ( taches[echeance] )
            && (
                ( taches[PctTache] >= 100 && NOT ISBLANK ( taches[dateFinReelle] ) )
                || ( taches[PctTache] < 100 && taches[echeance] < TODAY () )
            )
    )
VAR Respectees =
    FILTER ( Evaluables, taches[PctTache] >= 100 && taches[dateFinReelle] <= taches[echeance] )
RETURN
    IF ( COUNTROWS ( Evaluables ) > 0, DIVIDE ( COUNTROWS ( Respectees ), COUNTROWS ( Evaluables ) ) * 100 )
```

Le `IF` final reproduit le `-1` du Java : aucune échéance exploitable → la carte affiche
un blanc, pas un `0 %` qui accuserait le projet à tort.

---

## 9. Mesures — budget

Deux subtilités de `remplirBudget()`, toutes deux absentes de la première version du gros
document.

**1. Le repli sur le budget de cadrage** : si la fiche de suivi ne porte pas de prévision,
c'est `estimationBudget.budgetMDHT` de la fiche projet qui fait foi.

**2. Le signe de l'écart** : `ecartBudget = prevision − realisation`. Un écart **positif**
signifie donc qu'il **reste du budget**, pas qu'on a dépassé.

```dax
Budget prévision =
VAR p = CALCULATE ( SUM ( fiches_suivi[budgetPrevision] ), fiches_suivi[EstDerniereFiche] = 1 )
VAR cadrage = SUM ( fiches_projet[BudgetCadrage] )
RETURN IF ( COALESCE ( p, 0 ) > 0, p, cadrage )

Budget réalisation =
CALCULATE ( SUM ( fiches_suivi[budgetRealisation] ), fiches_suivi[EstDerniereFiche] = 1 )

-- Positif = reste à consommer. Négatif = dépassement.
Écart budget = [Budget prévision] - [Budget réalisation]

Taux consommation budget = DIVIDE ( [Budget réalisation], [Budget prévision] ) * 100

-- Le signal de dérive : consommer plus vite qu'on n'avance.
Dérive budgétaire (pts) = [Taux consommation budget] - [Avancement réel %]
```

---

## 10. Mesures — qualité et risques

```dax
Nb Problèmes       = CALCULATE ( COUNTROWS ( problemes ),       fiches_suivi[EstDerniereFiche] = 1 )
Nb Risques         = CALCULATE ( COUNTROWS ( risques ),         fiches_suivi[EstDerniereFiche] = 1 )
Nb Recommandations = CALCULATE ( COUNTROWS ( recommandations ), fiches_suivi[EstDerniereFiche] = 1 )
```

```dax
-- compterProblemesPersistants() : un problème déjà présent dans la fiche PRÉCÉDENTE.
-- C'est lui qui traduit un défaut de traitement — pas le fait de déclarer un problème.
Nb Problèmes persistants =
VAR Actuels =
    CALCULATETABLE ( VALUES ( problemes[LibelleNorm] ), fiches_suivi[EstDerniereFiche] = 1 )
VAR Anterieurs =
    CALCULATETABLE ( VALUES ( problemes[LibelleNorm] ), fiches_suivi[EstAvantDerniere] = 1 )
RETURN
    COALESCE ( COUNTROWS ( INTERSECT ( Actuels, Anterieurs ) ), 0 )
```

> **Écart assumé** : `VALUES` dédoublonne. Si la même phrase est saisie deux fois dans la
> même fiche, le Java compte 2, cette mesure compte 1. Sur des libellés rédigés à la main,
> le doublon exact est rare — mais mentionne-le si le jury compare ligne à ligne.

---

## 11. Mesures — le score de santé sur 100 points

`remplirScoreSante()` additionne 4 composantes **arrondies chacune à 1 décimale**, puis
arrondit le total à l'entier. Reproduis les deux arrondis, sinon tu auras des écarts de
0,1 point avec l'application.

```dax
-- Composante 1 (30 pts) : le SPI, plafonné à 1 — être en avance ne sur-note pas.
Score avancement =
IF (
    [Avancement planifié %] > 0,
    MIN ( [SPI], 1 ) * 30,
    DIVIDE ( [Avancement réel %], 100 ) * 30
)
```

```dax
-- Composante 2 (25 pts) : retard projet (max −15) + tâches hors délai (max −10).
Score délais =
VAR retard = SUMX ( fiches_projet, fiches_projet[JoursRetardProjet] )
RETURN
    MAX ( 0, 25 - MIN ( 15, DIVIDE ( retard, 2 ) ) - MIN ( 10, [Tâches en retard] * 2.5 ) )
```

```dax
-- Composante 3 (25 pts) : ne pénalise pas la transparence, mais l'inaction.
-- Un problème qui traîne coûte 3 pts, un problème nouveau 1 pt.
-- Un risque couvert par une recommandation coûte 1 pt, sinon 2,5.
Score qualité =
VAR persistants = MIN ( [Nb Problèmes persistants], [Nb Problèmes] )
VAR nouveaux    = [Nb Problèmes] - persistants
VAR poidsRisque = IF ( [Nb Recommandations] > 0, 1, 2.5 )
RETURN
    MAX (
        0,
        25 - MIN ( 15, persistants * 3 + nouveaux * 1 ) - MIN ( 10, [Nb Risques] * poidsRisque )
    )
```

```dax
-- Composante 4 (20 pts) : charge (12 via le CPI) + budget (8 via la dérive).
-- Donnée non renseignée = note neutre à 60 %, ni bonus ni sanction.
Score maîtrise =
VAR voletCharge = IF ( [Charge consommée (j)] > 0, MIN ( [CPI], 1 ) * 12, 12 * 0.6 )
VAR derive      = [Dérive budgétaire (pts)]
VAR voletBudget =
    IF (
        [Budget prévision] > 0 && [Budget réalisation] > 0,
        IF ( derive <= 0, 8, MAX ( 0, 8 - DIVIDE ( derive, 5 ) ) ),
        8 * 0.6
    )
RETURN voletCharge + voletBudget
```

```dax
Score de santé =
ROUND (
    MIN ( 100, MAX ( 0,
        ROUND ( [Score avancement], 1 ) + ROUND ( [Score délais],   1 )
      + ROUND ( [Score qualité],    1 ) + ROUND ( [Score maîtrise], 1 )
    ) ),
    0
)

Niveau de santé =
SWITCH (
    TRUE (),
    [Score de santé] >= 80, "EXCELLENT",
    [Score de santé] >= 60, "BON",
    [Score de santé] >= 40, "ATTENTION",
    "CRITIQUE"
)
```

### La mesure de niveau portefeuille

```dax
-- Une somme de scores n'a aucun sens : on moyenne projet par projet.
Score de santé portefeuille = AVERAGEX ( VALUES ( fiches_projet[_id] ), [Score de santé] )

Projets critiques =
COUNTROWS ( FILTER ( VALUES ( fiches_projet[_id] ), [Score de santé] < 40 ) )

Projets en dérive budgétaire =
COUNTROWS ( FILTER ( VALUES ( fiches_projet[_id] ), [Dérive budgétaire (pts)] > 10 ) )
```

---

## 12. Ordre de création — les dépendances

Crée dans cet ordre, sinon Power BI refusera la formule (référence à une mesure inexistante) :

1. **Power Query** : `taches`, `problemes`, `risques`, `recommandations`, colonnes ajoutées
   à `fiches_suivi` et `fiches_projet` · relations
2. **Colonnes** : `DateRef` → `EstDerniereFiche` → `EstAvantDerniere` (sur `fiches_suivi`)
3. **Colonnes** : `StatutNorm` (sur `taches`), `LibelleNorm` (sur `problemes`) →
   `EstDerniereFiche` (sur `taches`) → `PctTache`,
   `PoidsTache`, `EstDemarree`, `EstEnRetardDeclare`, `PlanifieTache`, `ValeurAcquiseTache`
4. **Colonnes** : `EstClos`, `JoursRetardProjet` (sur `fiches_projet`)
5. **Mesures** : avancement (§6) → charge (§7) → échéances (§8) → budget (§9) → qualité (§10)
6. **Mesures** : les 4 composantes du score, puis `Score de santé`, puis les mesures
   portefeuille

---

## 13. Les 6 pièges DAX de ce modèle

**1. La somme de mesures non additives.** `Score de santé`, `SPI`, `CPI`, `Avancement réel %`
ne s'additionnent pas. Au niveau portefeuille, toujours
`AVERAGEX ( VALUES ( fiches_projet[_id] ), [la mesure] )`. Sans ça, un total de 470 % s'affiche
et tout le rapport perd sa crédibilité.

**2. La transition de contexte.** Dans `SUMX ( fiches_projet, [Une mesure] )`, la mesure est
évaluée **dans le contexte du projet courant** — c'est ce qu'on veut. Mais
`SUMX ( fiches_projet, fiches_projet[UneColonne] )` ne fait aucune transition : les deux
écritures ne sont pas interchangeables.

**3. `BLANK()` n'est pas `0`.** `PlanifieTache` renvoie `BLANK()` pour exclure une tâche ;
si tu mets `0`, la tâche entre au dénominateur et tire l'avancement planifié vers le bas.
Même logique pour `Taux respect échéances`.

**4. Division : toujours `DIVIDE`.** L'opérateur `/` lève une erreur sur un dénominateur nul
et casse le visuel entier. `DIVIDE` renvoie `BLANK()`, qui s'affiche proprement.

**5. `CONTAINSSTRING` et les accents.** Voir la section 3 : sans normalisation, « Clôturé »
n'est pas détecté et le projet reste compté comme actif. Teste-le explicitement.

**6. `TODAY()` est figé à l'actualisation.** Toutes les mesures de retard en dépendent. Fais
`Accueil → Actualiser` avant toute capture d'écran ou démonstration, sinon tes retards
datent du dernier import.

---

## 14. Correspondance DAX ↔ Java — le tableau pour le mémoire

| Mesure DAX | Méthode `KPIService.java` | Constante |
|---|---|---|
| `Avancement réel %` | `avancementPondere()` | — |
| `Avancement planifié %` | `avancementPlanifie()` + `avancementPlanifieProjet()` | repli si `-1` |
| `SPI` | `remplirAvancement()` | — |
| `Date de fin projetée` | `projeterDateDeFin()` | `PROJECTION_MAX_JOURS = 3650` |
| `CPI` | `remplirCharge()` → `indiceEfficacite` | — |
| `Tâches échéance proche` | `remplirTaches()` | `HORIZON_ECHEANCE_JOURS = 14` |
| `Taux respect échéances` | `remplirTaches()` | `-1` si non évaluable |
| `Écart budget` | `remplirBudget()` | `prevision − realisation` |
| `Nb Problèmes persistants` | `compterProblemesPersistants()` | comparaison normalisée |
| `Score avancement` | `scoreAvancement()` | 30 pts |
| `Score délais` | `scoreDelais()` | 25 pts, −15 / −10 |
| `Score qualité` | `scoreQualite()` | 25 pts, `PENALITE_RISQUE_TRAITE = 1,0` / `NON_TRAITE = 2,5` |
| `Score maîtrise` | `scoreMaitrise()` | 20 pts (12 + 8), neutre à 60 % |
| `Niveau de santé` | `niveauSante()` | 80 / 60 / 40 |

C'est ce tableau qui répond à la question « **avez-vous recodé vos indicateurs une seconde
fois ?** » : non — même règle métier, deux moteurs d'exécution. Le référentiel de calcul
reste unique, et il est auditable ligne à ligne.

---

## 15. Recette — vérifier que les deux moteurs concordent

Prends **un projet qui a au moins deux fiches de suivi**, ouvre
`/pilote-qualite/projet-kpi/<id>` et une matrice Power BI filtrée sur ce seul projet.
Doivent coïncider, dans cet ordre de vérification :

1. `Nb Tâches` et `Tâches terminées` — s'ils divergent, le filtre `EstDerniereFiche` est en
   cause, ou une ligne de titre est passée au travers de la section 1.1.
2. `Avancement réel %` — s'il diverge alors que les tâches concordent, regarde `PctTache`
   (colonne `pourcentageRealise` mal typée en texte).
3. `Avancement planifié %` — divergence typique : le repli projet de la section 6.2 n'a pas
   été créé.
4. `Score de santé` — vérifie composante par composante, elles sont conçues pour ça.

Un écart de 0,1 point sur le score vient toujours des arrondis de la section 11.
