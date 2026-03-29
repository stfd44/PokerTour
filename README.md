# PokerTour

Application de gestion de tournois de poker.

## Fonctionnalités

- Gestion des tournois
- Gestion des joueurs
- Gestion des parties
- Suivi des statistiques
- Gestion des équipes
- Alertes sonores et notifications push pour les timers

## Web Push

L'application utilise Web Push standard pour les fins de niveau du timer.

### Fonctionnement

- chaque navigateur ou PWA autorise enregistre une `PushSubscription` dans `users/{userId}/devices/{deviceId}`
- le service worker web recoit les evenements `push` et affiche la notification systeme
- le trigger Firestore `syncTimerPushSchedule` observe les changements de partie dans `tournaments/{tournamentId}`
- une tache Cloud Tasks est planifiee pour l'heure exacte de fin du niveau courant
- la fonction `dispatchScheduledTimerPush` s'execute a l'heure prevue, reverifie l'etat reel de la table, puis envoie la notification via `web-push`
- les notifications sont envoyees aux joueurs de la table disposant d'un appareil enregistre, y compris les joueurs elimines
- le son de fin de niveau reste gere localement dans l'application quand la page de table est ouverte

### Conditions d'utilisation

- HTTPS obligatoire pour le Web Push
- sur iPhone, les notifications push web necessitent l'app ajoutee a l'ecran d'accueil
- la cle publique VAPID frontend doit correspondre a la cle publique VAPID utilisee par Firebase Functions

### Variables d'environnement frontend

Ajoutez ces variables dans votre `.env` en plus de la configuration Firebase existante:

```bash
VITE_FIREBASE_VAPID_KEY=
VITE_FIREBASE_VAPID_KEY_TEST=
```

La cle publique VAPID est la cle publique Web Push utilisee par le navigateur.

### Backend Firebase Functions

Generez une paire VAPID une seule fois:

```bash
npx web-push generate-vapid-keys --json
```

Avant le deploy, configurez les parametres / secrets Firebase utilises par les functions:

```bash
firebase functions:secrets:set WEB_PUSH_PRIVATE_KEY
```

Lors du premier deploy, Firebase vous demandera aussi:

- `WEB_PUSH_PUBLIC_KEY`
- `WEB_PUSH_SUBJECT` par exemple `mailto:contact@votredomaine.com`

Important:

- `WEB_PUSH_PUBLIC_KEY` doit correspondre a `VITE_FIREBASE_VAPID_KEY` pour le meme environnement
- utilisez un vrai `mailto:` ou une vraie URL publique pour `WEB_PUSH_SUBJECT`

Fonctions impliquees:

- `syncTimerPushSchedule` : cree, remplace ou annule la tache Cloud Tasks du niveau courant
- `dispatchScheduledTimerPush` : envoie la notification de fin de niveau a l'heure planifiee
- `sendPushTestToCurrentDevice` : envoie un push de test a l'appareil courant depuis la page Profil

Exemple:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions:syncTimerPushSchedule,functions:dispatchScheduledTimerPush,functions:sendPushTestToCurrentDevice,firestore:rules
```

## Versionnement automatique

L'application utilise un système de versionnement automatique basé sur les messages de commit Git. Le numéro de version est extrait du message de commit et affiché dans l'interface utilisateur.

### Comment ça marche

1. Le numéro de version est extrait du message de commit (la chaîne de caractères jusqu'au premier espace)
2. Le numéro de version est stocké dans un fichier `src/version.ts`
3. Le numéro de version est affiché dans le header de l'application

### Format du message de commit

Pour que le système de versionnement fonctionne correctement, les messages de commit doivent commencer par le numéro de version, suivi d'un espace et de la description du commit.

Exemple :
```
V1.1.45 Ajout de la fonctionnalité X
```

Dans cet exemple, le numéro de version est `V1.1.45`.

### Installation des hooks Git

Pour installer les hooks Git qui permettent de mettre à jour automatiquement le numéro de version, exécutez la commande suivante :

```
npm run install-hooks
```

Cette commande installe un hook pre-commit qui extrait le numéro de version du message de commit et met à jour le fichier `src/version.ts` avant chaque commit.

### Mise à jour manuelle du numéro de version

Pour mettre à jour manuellement le numéro de version, exécutez la commande suivante :

```
npm run update-version
```

Cette commande extrait le numéro de version du dernier commit et met à jour le fichier `src/version.ts`.
