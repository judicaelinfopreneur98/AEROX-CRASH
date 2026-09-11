# AEROX CRASH : Quantum Velocity 🚀

Plateforme de jeu Crash temps réel autoritaire complète et originale avec Provably Fair, Portefeuille multi-devises (FCFA, EUR, USD), Vérification Email obligatoire SMTP, WebSocket haute concurrence, double pari simultané et tableau de bord administrateur.

---

## 🌟 Identité & Nouvelles Fonctionnalités

- **Choix de la Devise à l'Inscription** :
  - **FCFA** (Afrique de l'Ouest et Centrale - XOF/XAF) avec montants adaptés et sans centimes
  - **EUR (€)** (Europe)
  - **USD ($)** (International)
  - La devise choisie est attachée au profil et synchronisée sur le portefeuille, les mises, les gains, les dépôts et les retraits.
- **Vérification Email Obligatoire** :
  - Envoi automatique d'un code de sécurité à 6 chiffres et d'un lien d'activation direct via le serveur SMTP (Breton Web Expert).
  - Verrouillage strict des fonctionnalités d'argent réel (dépôts, retraits, mises) tant que l'email n'est pas vérifié.
  - Bannière d'alerte et modale interactive de renvoi de code avec compte à rebours de sécurité.
- **Identité 100% Originale** : Nom, logo, interface cyberpunk sombre, vaisseau supersonique vectoriel *AEROX-X1*, ambiance sonore procédurale Web Audio API et musique de fond interactive (aucun asset ni élément propriétaire d'Aviator, 1xBet ou MelBet).
- **Autorité Serveur Absolue** : Le serveur calcule et scelle les résultats, cadence la montée du multiplicateur, contrôle les soldes et valide les cash-outs instantanés.
- **Double Pari Simultané** : Panneaux indépendants **BET 1** et **BET 2** avec gestion individuelle des montants, auto-cashout et bouton **Cash Out Manuel**.
- **Moteur Provably Fair Déterministe** : Engagement public par hash SHA-256 avant chaque manche, graine secrète révélée après le crash, vérification HMAC-SHA256 indépendante sur la page `/provably-fair`.
- **Portefeuille Transactionnel Sans Concurrence** : Verrous d'exclusion mutuelle par compte (Mutex), grand livre à double entrée (Ledger), protection absolue contre les doubles cash-outs et les soldes négatifs.
- **Dashboard Administrateur Intégré** : KPIs de rentabilité (GGR, RTP mesuré), gestion des utilisateurs (avec devise et statut email), suspension, ajustements de crédit et radar prédictif.

---

## 🏗️ Architecture du Projet

```
/app                       # Next.js App Router (Pages: /, /provably-fair, /history, /admin, /auth)
/components                # Composants UI React & Tailwind (CrashCanvas, BetPanel, LiveBets, Modals...)
/server                    # Serveur unifié Node.js (Next.js + WebSocket Server + Game Loop)
/game-engine               # Machine à états (WAITING -> BETTING -> RUNNING -> CRASHED -> RESULT)
/wallet                    # Moteur de portefeuille transactionnel (Ledger, Mutex, Idempotence)
/auth                      # Gestion JWT, hachage bcrypt, contrôle RBAC (USER, SUPPORT, ADMIN, SUPER_ADMIN)
/websocket                 # Hub WebSocket temps réel haute concurrence (ws, reconnexion automatique)
/prisma                    # Schéma relationnel PostgreSQL et générateur Prisma Client
/admin                     # Service d'administration et journal d'audit
/tests                     # Suite complète de tests unitaires et de concurrence (Vitest)
/lib                       # Utilitaires Provably Fair, Sound Synthesizer, Validations Zod, Email SMTP
```

---

## ⚡ Installation et Démarrage Local

### 1. Prérequis
- **Node.js** >= 18
- **PostgreSQL** (optionnel en dev grâce au fallback mémoire réactif)

### 2. Installation des Dépendances
```bash
npm install
```

### 3. Configuration des Variables d'Environnement
Copiez le fichier exemple :
```bash
cp .env.example .env
```
Renseignez les accès SMTP et la base PostgreSQL dans votre fichier `.env`.

### 4. Génération de Prisma
```bash
npx prisma generate
```

### 5. Démarrage de l'Application
```bash
npm run dev
```
Accédez ensuite à l'application sur : **http://localhost:3000**

---

## 🛡️ Comptes de Démonstration Préconfigurés

| Compte | Email | Mot de passe | Rôle | Devise | Email Vérifié |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Super Administrateur** | `admin@aerox.io` | `Admin123!` | `SUPER_ADMIN` | `EUR` | Oui |
| **Joueur Démo** | `demo@aerox.io` | `Demo123!` | `USER` | `EUR` | Oui |

Des boutons de connexion rapide sont directement intégrés dans la modale de connexion.

---

## 🧪 Tests Automatisés

Pour exécuter la suite de tests automatisés (concurrence, calculs Provably Fair, validation portefeuille) :

```bash
npm test
```

---

## 🚀 Déploiement : GitHub → Vercel & Serveur Temps Réel

### Pourquoi deux couches ?
- **Next.js (Frontend & API REST)** : Conçu pour être hébergé sur **Vercel** avec CDN mondial.
- **Moteur Temps Réel (WebSocket)** : Les jeux Crash nécessitent une boucle d'événements continue à 60-100 Hz (`server/index.ts`). Il se déploie sur un serveur Node.js persistant (**Render**, **Railway**, **Fly.io** ou **VPS**).

### Étape 1 : Push sur GitHub
```bash
git init
git add .
git commit -m "feat: complete AEROX CRASH with multi-currency, email verification and provably fair"
git remote add origin https://github.com/votre-compte/aerox-crash.git
git branch -M main
git push -u origin main
```

### Étape 2 : Déploiement du Serveur Temps Réel (Render / Railway)
1. Créez un service Web Node.js sur [Render.com](https://render.com) ou [Railway.app](https://railway.app).
2. Connectez votre dépôt GitHub.
3. Commande de build : `npm install && npx prisma generate`
4. Commande de démarrage : `npm run build:server && node dist/server.js`
5. Notez l'URL WebSocket publique attribuée (ex: `wss://aerox-server.onrender.com/ws`).

### Étape 3 : Déploiement sur Vercel
1. Rendez-vous sur [Vercel](https://vercel.com) et importez votre dépôt GitHub.
2. Définissez le framework sur **Next.js**.
3. Ajoutez les variables d'environnement suivantes dans Vercel Project Settings :
   - `NEXT_PUBLIC_WS_URL` : `wss://votre-serveur-websocket.onrender.com/ws`
   - `NEXT_PUBLIC_APP_URL` : `https://votre-projet.vercel.app`
   - `JWT_SECRET` : `votre-cle-secrete-production-tres-longue`
   - `DATABASE_URL` : `votre-chaine-connection-postgresql`
   - `SMTP_HOST` : `mail.bretonwebexpert.fr`
   - `SMTP_PORT` : `465`
   - `SMTP_SECURE` : `true`
   - `SMTP_USER` : `info@bretonwebexpert.fr`
   - `SMTP_PASS` : `U#BM*O%=bw5LTwTw`
   - `SMTP_FROM` : `"AEROX CRASH" <info@bretonwebexpert.fr>`
4. Cliquez sur **Deploy**.
