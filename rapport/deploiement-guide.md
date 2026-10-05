# Déploiement de Qualinet — GitHub Pages + Render + MongoDB Atlas

Tout est gratuit et sans carte bancaire. Chaque `git push` sur la branche `PFE` redéploie automatiquement.

```
git push (branche PFE)
   ├─► GitHub Actions ─► build Angular ─► GitHub Pages     https://douabaghdadi.github.io/PFE/
   └─► Render ─► build Docker ─► Spring Boot (API)         https://qualinet-api.onrender.com
                                      └─► MongoDB Atlas (cluster M0, Francfort)
```

Fichiers de déploiement dans le dépôt :

| Fichier | Rôle |
|---|---|
| `.github/workflows/deploy-frontend.yml` | Build Angular et publication sur GitHub Pages |
| `Dockerfile` + `.dockerignore` | Image du backend Spring Boot |
| `render.yaml` | Description du service Render (Blueprint) |
| `frontend/src/environments/environment.prod.ts` | Adresse de l'API en production |

> Il faut être **propriétaire ou admin** du dépôt `Douabaghdadi/PFE` pour les étapes 3 et 4.

---

## Étape 1 — Base de données MongoDB Atlas (≈ 10 min)

1. Créer un compte sur <https://www.mongodb.com/cloud/atlas/register>.
2. **Create a cluster** → offre **M0 (Free)** → fournisseur **AWS** → région **Frankfurt (eu-central-1)**, la même que Render.
3. **Database Access** → *Add New Database User* :
   - utilisateur : `qualinet` ;
   - mot de passe : bouton *Autogenerate* (lettres et chiffres uniquement, sinon il faut encoder les caractères spéciaux dans l'URI) → **le noter** ;
   - rôle : *Read and write to any database*.
4. **Network Access** → *Add IP Address* → **Allow access from anywhere** (`0.0.0.0/0`).
   Obligatoire : le plan gratuit de Render n'a pas d'adresse IP fixe.
5. **Connect** → *Drivers* → copier l'URI et y remplacer `<db_password>` :
   ```
   mongodb+srv://qualinet:MOT_DE_PASSE@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
   C'est la valeur de `MONGODB_URI`.

### Données

Au premier démarrage sur une base vide, le backend crée tout seul : les rôles, les nomenclatures, les comptes `admin` et `chefprojet`, et des projets de démonstration.

**Optionnel — reprendre tes données locales.** À faire **avant** le premier démarrage sur Render. Il faut installer les [MongoDB Database Tools](https://www.mongodb.com/try/download/database-tools), puis :

```bash
mongodump --uri="mongodb://localhost:27017" --db=test --out=dump
mongorestore --uri="URI_ATLAS" --nsFrom="test.*" --nsTo="qualinet.*" --drop dump/
```

(La base locale s'appelle `test` ; en production elle s'appelle `qualinet`.)

---

## Étape 2 — Pousser le code sur GitHub

Commiter et pousser sur la branche `PFE`. Vérifier que le commit contient bien :

- `src/main/resources/application.properties` (sans aucun secret, il est maintenant versionné) ;
- `src/main/resources/branding/` (logo des emails : sans lui, l'envoi d'emails échoue) ;
- `frontend/public/assets/images/branding/` et les nouveaux composants ;
- `Dockerfile`, `.dockerignore`, `render.yaml`, `.github/workflows/`.

Et qu'il **ne contient pas** `.env` (il est ignoré par Git : `git status` ne doit pas l'afficher).

---

## Étape 3 — Frontend sur GitHub Pages (≈ 5 min)

1. Sur GitHub : dépôt → **Settings** → **Pages** → *Build and deployment* → *Source* : **GitHub Actions**.
2. Onglet **Actions** → workflow **« Déploiement frontend (GitHub Pages) »** → **Run workflow**.
   Ensuite, il se relance tout seul à chaque push qui modifie `frontend/`.
3. Après ~3 min, le site est en ligne : <https://douabaghdadi.github.io/PFE/>

---

## Étape 4 — Backend sur Render (≈ 15 min)

1. Créer un compte sur <https://render.com> avec **Sign up with GitHub**, et autoriser l'accès au dépôt `PFE`.
2. **New +** → **Blueprint** → choisir le dépôt. Render lit `render.yaml` et propose le service `qualinet-api`.
3. Remplir les secrets demandés :

   | Variable | Valeur |
   |---|---|
   | `MONGODB_URI` | URI Atlas de l'étape 1 |
   | `MAIL_USERNAME` | même valeur que dans ton `.env` |
   | `MAIL_PASSWORD` | même valeur que dans ton `.env` (mot de passe d'application Gmail) |
   | `GEMINI_API_KEY` | même valeur que dans ton `.env` |

   `JWT_SECRET` est généré automatiquement. `MONGODB_DATABASE`, `FRONTEND_URL` et `CORS_ALLOWED_ORIGINS` sont déjà remplis.
4. **Apply**. Le premier build prend 5 à 10 min (Maven + Docker). Dans les logs, le déploiement est réussi quand on voit `Started DemoApplication`.
5. Tester : <https://qualinet-api.onrender.com/api/test/all> doit afficher
   « Contenu public accessible sans authentification. »
6. **Si Render donne une autre adresse** (nom déjà pris, ex. `qualinet-api-ab12.onrender.com`) : la mettre dans `apiUrl` de `frontend/src/environments/environment.prod.ts`, puis commit + push. GitHub Pages se redéploie tout seul.

<details>
<summary>Alternative sans Blueprint (création manuelle)</summary>

**New +** → **Web Service** → dépôt `PFE` → *Language* : **Docker** → *Branch* : `PFE` → *Region* : **Frankfurt** → *Instance type* : **Free** → *Health Check Path* : `/api/test/all`.
Ajouter les variables d'environnement : les 4 secrets ci-dessus, plus :

```
JWT_SECRET=<chaîne aléatoire en base64 d'au moins 32 octets>
MONGODB_DATABASE=qualinet
FRONTEND_URL=https://douabaghdadi.github.io/PFE
CORS_ALLOWED_ORIGINS=https://douabaghdadi.github.io
```
</details>

---

## Étape 5 — Vérifications

- [ ] Ouvrir <https://douabaghdadi.github.io/PFE/> et se connecter avec `admin`.
- [ ] **Changer tout de suite les mots de passe de `admin` et `chefprojet`** : le dépôt est public et les mots de passe par défaut sont visibles dans `AdminUserInitializer.java`.
- [ ] Rafraîchir (F5) sur une page interne, par ex. le dashboard : la page doit se recharger normalement.
- [ ] Tester le chatbot, l'export PDF/Excel, les notifications et le rapport Power BI.
- [ ] *Mot de passe oublié* : l'email doit arriver avec un lien vers `https://douabaghdadi.github.io/PFE/reset-password?...`.
  Si rien n'arrive et que les logs Render montrent un *timeout* vers `smtp.gmail.com`, c'est que Render bloque le SMTP sur le plan gratuit : il faudra passer par une API d'email (Brevo).

---

## Étape 6 (optionnel) — Éviter la mise en veille

Sur le plan gratuit, Render met le backend en veille après 15 min sans requête, et le réveil prend 1 à 2 min.

- Créer un compte gratuit sur <https://uptimerobot.com> → *New monitor* → type **HTTP(s)** → URL `https://qualinet-api.onrender.com/api/test/all` → intervalle **5 min**.
  Les 750 h gratuites par mois de Render suffisent pour un service allumé en permanence.
- Le jour de la soutenance : ouvrir le site quelques minutes avant, et garder une version locale en secours.

---

## Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| Erreur **CORS** dans la console du navigateur | `CORS_ALLOWED_ORIGINS` incorrect | Exactement `https://douabaghdadi.github.io` (sans `/PFE`, sans `/` final) |
| Première requête très lente ou erreur 502 | Backend Render en train de se réveiller | Attendre 1 à 2 min (voir étape 6) |
| Logs Render : `Authentication failed` (Mongo) | Mauvais mot de passe dans l'URI | Vérifier `MONGODB_URI`, éviter les caractères spéciaux |
| Logs Render : *timeout* vers `mongodb.net` | Accès réseau Atlas | *Network Access* → `0.0.0.0/0` |
| Page blanche ou 404 sur GitHub Pages | Pages pas activé, ou workflow en échec | *Settings → Pages → Source : GitHub Actions*, puis voir l'onglet **Actions** |
| Le front appelle une mauvaise adresse d'API | `apiUrl` différent de l'URL Render | Corriger `environment.prod.ts` puis push |
