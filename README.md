# PokerTour

Application de gestion de tournois de poker.

## Fonctionnalités

- Gestion des tournois
- Gestion des joueurs
- Gestion des parties
- Suivi des statistiques
- Gestion des équipes

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
