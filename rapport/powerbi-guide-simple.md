# Power BI — Dashboard Pilote Qualité, version simple

Objectif : **une seule page** qui reproduit le dashboard `/pilote-qualite/dashboard`
(les 6 cartes KPI, le donut de conformité, le tableau des retards, les dépôts par mois).
Pas de score de santé, pas d'EVM, pas d'influenceurs clés — ça, c'est l'autre document
(`powerbi-dashboard-pilote-qualite.md`), à garder pour plus tard si tu as le temps.

Les formules ci-dessous reproduisent **exactement** la logique de
`FicheProjetService.getProjetsSuiviStatus()` et de `dashboard.component.ts`, pour que
Power BI et l'application affichent les mêmes chiffres. Si le jury compare les deux
écrans, ils doivent concorder.

Temps de réalisation : environ 2 h.

---

## Étape 1 · Ne charger que 2 tables (10 min)

`Accueil → Transformer les données`.

Dans le volet de gauche, **clic droit sur chaque requête inutile → décocher
« Activer le chargement »** : `users`, `roles`, `notifications`,
`password_reset_tokens`, `historique_modifications`, `nomenclatures`.

Tu ne gardes que **`fiches_projet`** et **`fiches_suivi`**. Le chef de projet est déjà
dans `fiches_projet.responsable` (c'est ce que lit le dashboard Angular), donc aucune
jointure vers `users` n'est nécessaire.

>  **Ne charge pas `users`** : la collection contient la colonne `password` (empreintes de
> mots de passe). Elle n'a rien à faire dans un fichier `.pbix` que tu vas montrer et
> peut-être partager. Le nom du chef de projet est déjà dans `fiches_projet[responsable]`.

Dans les deux tables gardées, supprime aussi la colonne **`_class`** : c'est un marqueur
technique de Spring Data (le nom de la classe Java), sans usage analytique.

---

## Étape 2 · Nettoyer `fiches_projet` (10 min)

Sélectionne la requête → `Accueil → Choisir les colonnes` → ne coche que :

```
_id, nomProjet, responsable, statut, categorie, typeProjet,
dateDebut, dateFinPrevue,
dateDerniereFicheSuivi, dateProchaineFicheSuivi, periodiciteSuiviMois
```

Puis :

1. **Vérifie** le type des 5 colonnes de date. Dans ton modèle elles sont déjà reconnues
   (Power BI leur a créé une hiérarchie de dates) : il n'y a rien à corriger, mais contrôle
   que `dateProchaineFicheSuivi` en fait bien partie — toute la logique de retard en dépend.
2. `periodiciteSuiviMois` est déjà numérique (icône Σ) : rien à faire.
3. **Extrais l'identifiant du JSON.** Le connecteur livre les ObjectId sous la forme
   `{"$oid":"69c5cba7..."}`, alors que `fiches_suivi[ficheProjetId]` contient la chaîne
   brute `69c5cba7...`. Sans cette étape, la relation ne rapproche aucune ligne et toutes
   les mesures renvoient des blancs. `Ajouter une colonne → Colonne personnalisée`,
   nomme-la `ProjetId` :

   ```m
   = try Json.Document([_id])[#"$oid"] otherwise Text.From([_id])
   ```

   Type **Texte**. C'est `ProjetId`, et non `_id`, qui portera la relation.
   *(Si tes `_id` sont déjà des chaînes simples, la formule les renvoie telles quelles :
   tu peux la laisser dans tous les cas.)*
4. Clic droit sur `responsable` → `Remplacer les valeurs` → remplacer `null` par
   `Non attribué` (coche *Faire correspondre le contenu entier de la cellule*).
5. **Ne renomme pas la requête** : on garde `fiches_projet`, le nom de la collection
   MongoDB. Toutes les formules de ce guide l'utilisent tel quel.

Les colonnes texte longues (`presentation`, `historique`, `perimetre`, `objectifs`…)
n'alimentent aucun visuel : les supprimer allège le modèle et accélère l'actualisation.

---

## Étape 3 · Nettoyer `fiches_suivi` + calculer la complétude (25 min)

`Choisir les colonnes` → garde :

```
_id, ficheProjetId, dateRapport, numeroRapport,
ficheSignaletique, constatGlobal, tachesSuivi, planningActuel
```

**Regarde d'abord comment le connecteur te les a livrées** : clique sur une cellule de la
colonne `constatGlobal` dans l'aperçu de Power Query.

- Elle affiche **`[Record]`** → variante A ci-dessous (le cas normal).
- Elle affiche **du texte JSON** (`{"etatAvancement":"..."}`) → variante B.

Dans les deux cas, **ne développe pas les colonnes** : on les lit d'un coup dans une
colonne calculée.

### Variante A — colonnes `[Record]` / `[List]`

`Ajouter une colonne → Colonne personnalisée`, nomme-la **`Completude`**, et colle :

```m
let
    rempli = (v) => v <> null and Text.Trim(Text.From(v)) <> "",
    sig = try [ficheSignaletique] otherwise null,
    con = try [constatGlobal]     otherwise null,
    tac = try [tachesSuivi]       otherwise {},
    pla = try [planningActuel]    otherwise null,

    r1 = rempli(try sig[maitreOuvrage] otherwise null)
     and rempli(try sig[maitreOeuvre]  otherwise null)
     and rempli(try sig[chefProjet][nom] otherwise null),

    r2 = ((try sig[delais][dateDebut] otherwise null) <> null
       or (try sig[delais][dateDebutPrevision] otherwise null) <> null)
     and ((try sig[delais][dateFin] otherwise null) <> null
       or (try sig[delais][dateFinPrevision] otherwise null) <> null)
     and (try sig[financier][budgetPrevision] otherwise null) <> null,

    r3 = rempli(try con[etatAvancement]    otherwise null)
     and rempli(try con[objectifPrincipal] otherwise null),

    r4 = List.Count(List.Select(tac, each (try [estTitre] otherwise null) <> true)) > 0,

    r5 = List.Count(try pla[taches] otherwise {}) > 0,

    r6 = List.Count(List.Select(try con[recommandations] otherwise {}, each rempli(_))) > 0,

    ok = List.Count(List.Select({r1, r2, r3, r4, r5, r6}, each _ = true))
in
    Number.Round(ok / 6 * 100)
```

### Variante B — colonnes livrées en texte JSON

Si le connecteur a sérialisé les documents imbriqués, remplace les 4 premières lignes du
`let` par un décodage préalable, le reste du code est identique :

```m
let
    rempli = (v) => v <> null and Text.Trim(Text.From(v)) <> "",
    lire = (t) => try Json.Document(t) otherwise null,
    sig = lire([ficheSignaletique]),
    con = lire([constatGlobal]),
    tac = try lire([tachesSuivi]) otherwise {},
    pla = lire([planningActuel]),
    // … la suite (r1 à r6, ok) ne change pas …
```

Ce sont les 6 rubriques auditées par `auditerFiches()` : fiche signalétique, délais &
financier, constat global, tâches de suivi, planning, recommandations. Une rubrique
compte dès qu'elle est **présente** — on ne juge jamais la valeur métier, exactement
comme dans l'application.

Ensuite :

1. Type **Nombre entier** sur `Completude`.
2. Supprime les 4 colonnes `ficheSignaletique`, `constatGlobal`, `tachesSuivi`,
   `planningActuel` (elles ont fait leur travail).
3. Type **Date** sur `dateRapport`.
4. **Ne renomme pas la requête** : on garde `fiches_suivi`.

`Accueil → Fermer et appliquer`.

---

## Étape 4 · Table de dates + relations (10 min)

`Modélisation → Nouvelle table` :

```dax
DimDate =
ADDCOLUMNS (
    CALENDAR ( DATE ( 2024, 1, 1 ), DATE ( 2027, 12, 31 ) ),
    "Annee",     YEAR ( [Date] ),
    "NumMois",   MONTH ( [Date] ),
    "Mois",      FORMAT ( [Date], "MMM" ),
    "AnneeMois", FORMAT ( [Date], "YYYY-MM" )
)
```

Sélectionne la colonne `Mois` → `Outils de colonne → Trier par colonne → NumMois`.
Puis clic droit sur la table `DimDate` → **Marquer comme table de dates** (colonne `Date`).

Vue **Modèle**, crée 2 relations en glissant les champs :

| De | Vers | Cardinalité |
|---|---|---|
| `fiches_projet[ProjetId]` | `fiches_suivi[ficheProjetId]` | 1 → * |
| `DimDate[Date]` | `fiches_suivi[dateRapport]` | 1 → * |

> Si Power BI accepte la relation mais que tous tes visuels restent vides, c'est que les
> deux colonnes ne contiennent pas la même chose : compare une valeur de
> `fiches_projet[ProjetId]` et une de `fiches_suivi[ficheProjetId]`, elles doivent être
> identiques caractère pour caractère. Les deux doivent aussi être de type **Texte**.

---

## Étape 5 · 6 colonnes calculées sur `fiches_projet` (15 min)

> **Le bon bouton, sinon rien ne marche.** Ces 6 formules sont des **colonnes**, pas des
> mesures. Une mesure n'a pas de contexte de ligne : elle ne sait pas de quel projet tu
> parles, et Power BI répond *« nous ne pouvons pas déterminer une valeur unique pour la
> colonne… »*.
>
> 1. Clique **d'abord sur la table `fiches_projet`** dans le volet Données — c'est elle qui
>    décide où la colonne atterrit.
> 2. Ruban **Modélisation → Nouvelle colonne**.
>
> Aide-mémoire pour la suite : étape 5 = `Nouvelle colonne` · étape 6 = `Nouvelle mesure` ·
> `DimDate` = `Nouvelle table`.

`Modélisation → Nouvelle colonne`, une par une. C'est ici que vit toute la logique métier.

```dax
NbFiches = COALESCE ( COUNTROWS ( RELATEDTABLE ( fiches_suivi ) ), 0 )
```

```dax
-- Un projet TERMINE ou ANNULE n'est plus soumis au cycle de reporting :
-- même exclusion que getProjetsSuiviStatus(). Les 4 codes possibles sont
-- EN_COURS, TERMINE, EN_ATTENTE, ANNULE (DataInitializer.java) : ce sont des codes
-- ASCII en majuscules, la comparaison exacte suffit, aucune normalisation nécessaire.
EstSuivable = NOT ( COALESCE ( fiches_projet[statut], "" ) IN { "TERMINE", "ANNULE" } )
```

```dax
-- Retard = jours écoulés depuis la date de dépôt attendue.
JoursRetard =
IF (
    fiches_projet[EstSuivable]
        && NOT ISBLANK ( fiches_projet[dateProchaineFicheSuivi] )
        && fiches_projet[dateProchaineFicheSuivi] < TODAY (),
    DATEDIFF ( fiches_projet[dateProchaineFicheSuivi], TODAY (), DAY ),
    0
)
```

```dax
-- Les 3 états du donut, dans l'ordre de priorité du composant Angular.
Conformité =
SWITCH (
    TRUE (),
    fiches_projet[NbFiches] = 0,     "Jamais suivi",
    fiches_projet[JoursRetard] > 0,  "Fiche en retard",
    "Suivi à jour"
)
```

```dax
-- Négatif = échéance dépassée, positif = jours restants.
JoursAvantEcheance =
IF (
    NOT ISBLANK ( fiches_projet[dateProchaineFicheSuivi] ),
    INT ( fiches_projet[dateProchaineFicheSuivi] - TODAY () )
)
```

```dax
-- Mêmes paliers que severite() : > 60 j critique, > 30 j élevé.
Sévérité =
SWITCH (
    TRUE (),
    fiches_projet[JoursRetard] = 0,  "—",
    fiches_projet[JoursRetard] > 60, "Critique",
    fiches_projet[JoursRetard] > 30, "Élevé",
    "Modéré"
)
```

---

## Étape 6 · Les mesures (20 min)

`Accueil → Entrer des données` → table nommée `_Mesures`, une colonne bidon, `Charger`.
Crée les mesures dedans (tu masqueras la colonne bidon à la fin).

### Les 6 cartes KPI du dashboard

```dax
Nb projets = COUNTROWS ( fiches_projet )

Projets à jour   = CALCULATE ( [Nb projets], fiches_projet[Conformité] = "Suivi à jour" )
Fiches en retard = CALCULATE ( [Nb projets], fiches_projet[Conformité] = "Fiche en retard" )
Jamais suivis    = CALCULATE ( [Nb projets], fiches_projet[Conformité] = "Jamais suivi" )

Taux de conformité = DIVIDE ( [Projets à jour], [Nb projets] )

Complétude moyenne = DIVIDE ( AVERAGE ( fiches_suivi[Completude] ), 100 )

Échéances sous 30 j =
CALCULATE (
    [Nb projets],
    FILTER (
        fiches_projet,
        fiches_projet[JoursAvantEcheance] >= 0 && fiches_projet[JoursAvantEcheance] <= 30
    )
)
```

Format : `Taux de conformité` et `Complétude moyenne` en **Pourcentage, 0 décimale**
(`Outils de mesure → Format`).

### Le bandeau d'alerte

```dax
Nb fiches déposées    = COUNTROWS ( fiches_suivi )
Total jours de retard = SUMX ( fiches_projet, fiches_projet[JoursRetard] )
Pire retard (j)       = MAXX ( fiches_projet, fiches_projet[JoursRetard] )
```

### La 6e carte alternative — dérive de dépôt *(optionnel)*

Le dashboard Angular affiche « Dérive de dépôt » : l'écart moyen entre l'intervalle réel
entre deux dépôts et la périodicité attendue. Négatif = en avance, positif = en retard.

```dax
Dérive de dépôt (j) =
AVERAGEX (
    FILTER (
        fiches_projet,
        fiches_projet[NbFiches] >= 2 && NOT ISBLANK ( fiches_projet[periodiciteSuiviMois] )
    ),
    VAR Premiere = CALCULATE ( MIN ( fiches_suivi[dateRapport] ) )
    VAR Derniere = CALCULATE ( MAX ( fiches_suivi[dateRapport] ) )
    VAR Nb       = CALCULATE ( COUNTROWS ( fiches_suivi ) )
    RETURN
        DIVIDE ( INT ( Derniere - Premiere ), Nb - 1 )
            - fiches_projet[periodiciteSuiviMois] * 30.44
)
```

Si tu préfères rester simple, remplace cette carte par `Total jours de retard`.

---

## Étape 7 · La page (40 min)

Une page, format 1280 × 720 (`Format de la page → 16:9`).

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Zone de texte verte : « Supervision du processus qualité »              │  bandeau
│  Cartes : Nb projets · Nb fiches déposées                                │
├──────────────────────────────────────────────────────────────────────────┤
│  Segments : statut  |  responsable  |  DimDate[Annee]                    │  filtres
├────────┬────────┬────────┬────────┬────────┬─────────────────────────────┤
│ Conf.  │ Retard │ Jamais │ Complét│ Échéan.│ Total jours de retard       │  6 cartes
├──────────────────────────┬───────────────────────────────────────────────┤
│  Donut Conformité        │  Histogramme : dépôts par mois                │
├──────────────────────────┴───────────────────────────────────────────────┤
│  Tableau : fiches de suivi en retard (barres de données)                  │
├──────────────────────────────────────────────────────────────────────────┤
│  Barres empilées : discipline par chef de projet                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Les 6 cartes** — visuel *Carte*, une par mesure : `Taux de conformité`,
`Fiches en retard`, `Jamais suivis`, `Complétude moyenne`, `Échéances sous 30 j`,
`Total jours de retard`. Renomme chaque titre comme dans l'app
(« Conformité du suivi », « Fiches en retard », …).

**Donut Conformité** — visuel *Anneau*. Légende `fiches_projet[Conformité]`,
Valeurs `Nb projets`. Puis `Format → Couleurs des données`, exactement les couleurs
de `CONFORMITE_DEFS` :

| État | Couleur |
|---|---|
| Suivi à jour | `#09C82C` |
| Fiche en retard | `#ef4444` |
| Jamais suivi | `#94a3b8` |

**Dépôts par mois** — *Histogramme groupé*. Axe X `DimDate[AnneeMois]`,
Axe Y `Nb fiches déposées`. C'est l'équivalent lisible de la heatmap Angular.

**Tableau des retards** — visuel *Tableau*, colonnes :
`nomProjet`, `responsable`, `dateDerniereFicheSuivi`, `dateProchaineFicheSuivi`,
`JoursRetard`, `Sévérité`.
Dans le volet *Filtres du visuel* → `Conformité` **is** `Fiche en retard`.
Puis `Format → Mise en forme conditionnelle` :

- sur `JoursRetard` → **Barres de données**, couleur positive `#ef4444` ;
- sur `Sévérité` → **Couleur d'arrière-plan → Format par : Règles** :
  Critique `#fee2e2`, Élevé `#ffedd5`, Modéré `#fef9c3`.

Trie par `JoursRetard` décroissant (clic sur l'en-tête).

**Discipline par chef de projet** — *Histogramme empilé*. Axe `responsable`,
Valeurs `Projets à jour`, `Fiches en retard`, `Jamais suivis` (mêmes 3 couleurs que le donut).

**Segments** — `statut`, `responsable`, `DimDate[Annee]`. Style *Liste déroulante*
(`Format → Paramètres du segment → Style`) pour tenir dans le bandeau.

---

## Étape 8 · Thème aux couleurs de Qualinet (5 min)

`Affichage → Thèmes → Personnaliser le thème actuel`, ou crée `qualinet-theme.json` :

```json
{
  "name": "Qualinet",
  "dataColors": ["#09C82C", "#ef4444", "#94a3b8", "#f59e0b", "#3b82f6", "#8b5cf6"],
  "background": "#FFFFFF",
  "foreground": "#1e293b",
  "good": "#09C82C",
  "neutral": "#f59e0b",
  "bad": "#ef4444"
}
```

Le vert `#09C82C` est celui du bandeau de l'application : le rapport et l'app se lisent
alors comme un seul produit, ce qui se voit immédiatement sur une capture d'écran.

---

## Étape 9 · Vérification avant de capturer l'écran

Ouvre l'application sur `/pilote-qualite/dashboard` et Power BI côte à côte. Doivent
être **identiques** :

- le nombre de projets et de fiches déposées ;
- le taux de conformité ;
- le nombre de fiches en retard, et le pire retard en jours ;
- les projets listés dans le tableau des retards.

Un écart vient presque toujours d'une des trois causes suivantes :

1. une colonne de date restée en **texte** dans Power Query ;
2. la relation `fiches_projet[ProjetId] → fiches_suivi[ficheProjetId]` absente, inactive,
   ou rapprochant `{"$oid":"..."}` d'une chaîne brute (voir étape 2, point 3) ;
3. `EstSuivable` mal typé — vérifie que `statut` contient bien `TERMINE` / `ANNULE`
   en majuscules dans ta base.

> `TODAY()` n'est évalué qu'à l'actualisation du modèle. Fais `Accueil → Actualiser`
> juste avant la soutenance, sinon les retards seront figés à la date du dernier import.

---

## Ce que tu écris dans le mémoire

Une demi-page suffit, avec la capture d'écran :

> Le dashboard Power BI reprend les indicateurs de supervision du processus qualité en
> réutilisant les mêmes règles de calcul que l'application (exclusion des projets
> `TERMINE`/`ANNULE`, retard mesuré à partir de `dateProchaineFicheSuivi`, complétude
> auditée sur les six rubriques de la fiche de suivi). L'apport de Power BI est le
> filtrage croisé : cliquer un chef de projet dans l'histogramme refiltre
> instantanément les cartes, le donut et le tableau des retards, sans qu'aucun écran
> n'ait à être développé pour cette combinaison de filtres.

C'est l'argument qui tient debout sans surpromettre : **mêmes chiffres, exploration
libre**. Et il se démontre en direct en trois clics devant le jury.
