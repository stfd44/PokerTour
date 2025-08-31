# Détails de la Gestion d'une Partie de Poker

Ce document détaille le fonctionnement d'une partie de poker au sein de l'application et décrit les modifications à apporter pour implémenter de nouvelles fonctionnalités de contrôle par les joueurs.

## 1. Fonctionnement d'une Partie (`in_progress`)

Lorsqu'un tournoi est en cours, une partie est gérée de la manière suivante :

*   **Démarrage :** La partie est lancée par **un membre du tournoi**. Le statut du tournoi passe à `in_progress`. Auparavant, seul le créateur pouvait lancer la partie.
*   **Gestion du Temps et des Blinds :**
    *   Un timer est initié, basé sur la `duration` définie pour chaque niveau dans `blindLevels`.
    *   Les blinds augmentent automatiquement à la fin de chaque niveau.
    *   **N'importe quel joueur de la partie** peut désormais manuellement :
        *   Mettre en pause (`pauseTimer`) ou reprendre (`resumeTimer`) le timer.
        *   Passer au niveau de blind suivant (`advanceBlindLevel`) ou précédent (`goToPreviousLevel`).
        *   Modifier la durée du niveau en cours.
        *   Modifier les blinds (petite et grosse).
*   **Gestion des Joueurs :** Le créateur du tournoi conserve les droits pour gérer les éliminations et les rebuys.
*   **Fin de la partie :** Le créateur met fin à la partie, ce qui met à jour son statut.

Cette logique est gérée par les actions du store Zustand qui modifient l'état du tournoi dans Firestore. Les permissions sont étendues pour permettre une gestion collaborative de la partie.

---

## 2. Fonctionnalités de Contrôle Étendues pour les Joueurs

### Objectif

Donner une flexibilité maximale, notamment pour les parties amicales, en permettant à **n'importe quel joueur participant** à une partie en cours de contrôler tous les aspects du jeu. De plus, n'importe quel membre d'un tournoi peut en démarrer une partie.

### Logique des fonctionnalités

*   **Démarrage de partie :** Tout utilisateur dont l'UID est présent dans la liste des `participants` du tournoi peut lancer une partie (`startGame`).
*   **Contrôles en jeu :** Une fois la partie commencée, tout utilisateur dont l'UID est présent dans la liste des `players` de la partie en cours peut effectuer les actions suivantes :
    *   **Modifier les blinds :** Saisir de nouvelles valeurs pour la petite et la grosse blind et les appliquer immédiatement au niveau en cours.
    *   **Gérer le timer :**
        *   Mettre en pause / Reprendre le timer.
        *   Réinitialiser le timer pour le niveau actuel.
        *   Forcer le passage au niveau suivant ou précédent.
    *   **Modifier la durée du niveau :** Ajuster la durée prévue pour le niveau en cours, ce qui recalcule automatiquement le temps restant.

---

## 3. Modifications à Apporter

Pour implémenter ces fonctionnalités, les changements suivants sont nécessaires :

### a. Interface Utilisateur (UI)

Dans la vue de la partie en cours :

*   **Section Timer :**
    *   À côté du temps restant, afficher un champ de saisie (input) pour la **"Durée du niveau (min)"**.
    *   Ajouter un bouton "Valider" pour mettre à jour cette durée.
    *   Les boutons "Pause/Reprendre", "Niveau Précédent" et "Niveau Suivant" doivent être accessibles à tous les joueurs de la partie.

*   **Section Blinds :**
    *   Ajouter deux champs de saisie pour la "Petite Blind" et la "Grosse Blind".
    *   Ajouter un bouton "Mettre à jour les blinds" pour soumettre les nouvelles valeurs.

### b. Logique (State Management - Zustand/Firestore)

1.  **Nouvelle action dans le store `useGameStore` :**
    *   `updateBlinds(tournamentId, gameId, newBlinds)` : Met à jour l'objet `blinds` pour le niveau en cours dans `games[...].blindLevels[currentLevel]`.
    *   `updateLevelDuration(tournamentId, gameId, newDuration)` : Met à jour la propriété `duration` pour le niveau en cours dans `games[...].blindLevels[currentLevel]`.

2.  **Mise à jour des actions existantes :**
    *   **`startGame`** : La vérification des permissions doit s'assurer que l'UID de l'utilisateur (`auth.uid`) est présent dans le tableau `participants` du tournoi, et non plus seulement égal au `creatorId`.
    *   **Contrôles en jeu** (`pauseTimer`, `resumeTimer`, `advanceBlindLevel`, etc.) : La vérification des permissions doit s'assurer que l'UID de l'utilisateur est présent dans le tableau `game.players` de la partie en cours.

3.  **Nouvelles actions pour le timer :**
    *   Créer une action `goToPreviousLevel(tournamentId, gameId)` pour décrémenter `currentLevel`.
    *   Créer une action `resetLevelTimer(tournamentId, gameId)` qui réinitialise `levelStartTime` à `Date.now()`.

### c. Backend (Règles de Sécurité Firestore)

Les règles de sécurité Firestore doivent être mises à jour pour refléter ces nouvelles permissions.

**Exemple de règle à adapter :**

```js
// functions/firestore.rules

function isTournamentParticipant(tournament, userId) {
  // participants est un tableau d'objets { id, name, ... }
  return tournament.participants.exists(p => p.id == userId);
}

function isPlayerInGame(game, userId) {
  // players est un tableau d'objets { id, name, ... }
  return game.players.exists(p => p.id == userId);
}

match /tournaments/{tournamentId} {
  allow update: if request.auth.uid == resource.data.creatorId ||
                   // Permet à un participant de démarrer une partie
                   (request.resource.data.status == 'in_progress' && isTournamentParticipant(resource.data, request.auth.uid)) ||
                   // Permet à un joueur de la partie de la modifier
                   isPlayerInGame(request.resource.data.games[/* logique pour trouver le jeu */], request.auth.uid);

  // Une logique plus fine est nécessaire pour :
  // 1. Trouver le bon jeu dans le tableau `games`.
  // 2. Restreindre les champs modifiables (par ex. un joueur ne peut pas changer le `creatorId`).
  // Exemple pour la mise à jour d'un jeu spécifique :
  // allow update: if request.auth.uid == resource.data.creatorId ||
  //                  (request.resource.data.games[gameId].players.exists(p => p.id == request.auth.uid) &&
  //                   request.resource.data.diff(resource.data).affectedKeys().hasOnly(['games']));
}
```