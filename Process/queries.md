## V0.6
analyse le markdown du fichier projet.md, qui contient tout le contexte nécessaire pour comprendre le projet de ma web app "poker tour", je veux effectuer l'évolution suivante :
Quand on créée une nouvelle partie, je veux que le montant du prize pool soit affiché, celui-ci correspond au montant du buy-in fois le nombre de joueurs, l'affichage est dynamique en fonction du nombre de joeurs sélectionnés au momment de la cration de la partie.
Je veux aussi pouvoir paramétrer le pourcentage de répartition pour les 3 premières places.
le gain estimé pour les 3 premiers est affiché et mis à jour en fonction du pourcentage chosi également au moment de la création de la partie.
La répartition par défaut est 60%, 25%, 15%.
Le montant des gains des 3 premiers s'affiche également en fin de partie sur la page existante de résumé de la partie.
voici la règle pour la répartition des gains :
1. Paramètres d'entrée :
   - Montant total du prize pool (nombre entier positif en euros)
   - Pourcentages de répartition pour les 3 premières places (sous forme de trois valeurs dont la somme fait 100%)

2. Règles de répartition :
   - Le 1er joueur reçoit le pourcentage le plus élevé du prize pool
   - Le 2ème joueur reçoit le deuxième pourcentage du prize pool
   - Le 3ème joueur reçoit le troisième pourcentage du prize pool
   - Chaque montant doit être arrondi au multiple de 5€ le plus proche
   - La somme totale après arrondissement doit être égale au prize pool original

3. Comportement attendu :
   - Si l'arrondissement provoque un écart avec le prize pool initial, ajustez le montant du premier joueur pour compenser
   - Imprimez le détail des calculs et les montants finaux pour chaque position
   - Vérifiez que la somme des montants finaux est égale au prize pool initial, pour cela utiliser des boutons +/- pourmodifier par pallier de 5% et répercuter le nouveau pourcentage sur les autres places.
   

4. Exemple de résultat attendu pour un prize pool de 60€ avec répartition 60%, 25%, 15% :
   - 1er : 35€
   - 2e : 15€ 
   - 3e : 10€
   - Total : 60€

La fonction doit fonctionner pour tous les montants de prize pool positifs et entiers, avec n'importe quelle combinaison de pourcentages dont la somme fait 100%.
Le succès est validé si l'évolution est réalisée sans affecter les autres fonctions existantes.
## V0.51 - games début-fin durée
analyse le markdown du fichier projet.md, qui contient tout le contexte nécessaire pour comprendre le projet de ma web app "poker tour", je veux effectuer l'évolution suivante :
A la fin d'une partie je veux pouvoir visualiser des éléments de synthèse, comme l'heure de début et l'heure de fin de la partie, les positions des joueurs en commençant par le vainqueur puis le 2ème, le 3ème etc. avec l'heure de leur élimmination.
Le succès est validé si l'évolution est réalisée sans affecter les autres fonctions existantes.
## V0.50 - après la fin du timer des blend, validation
analyse le markdown du fichier projet.md, qui contient tout le contexte nécessaire pour comprendre le projet de ma web app "poker tour", je veux effectuer l'évolution suivante :
Dans une partie en cours à la fin du timer des blind, actuellement le passage aux nouveaux montant est automatique, je veux avoir un bouton de validation pour passer à l'augmentation suivante et relancer le timer, je ne veux plus que l'augmentation soit automatique.
Le succès est validé si l'évolution est réalisée sans affecter les autres fonctions existantes.
## V0.46 - corriger la gestion des parties
analyse le markdown du fichier projet.md, qui contient tout le contexte nécessaire pour comprendre le projet de ma web app "poker tour", il y a un bug à corriger :
Lorsque je veux débuter un tournoi (voir capture jointe), j'arrive sur une page blanche.
Le succès est validé si la correction est réalisée sans affecter les autres fonctions existantes.

## V0.451 - nouvelle gestion des utilisateurs et surnom
analyse le markdown du fichier projet.md, qui contient tout le contexte nécessaire pour comprendre le projet de ma web app "poker tour", il y a un bug à corriger :
Lors de la création d'une équipe j'ai le message : " vous devez être connecté" 
Je suis pourtant bien connecté à ce moment, voir capture d'écran jointe.
Le succès est validé si l'évolution est réalisée sans affecter les autres fonctions existantes.
 
 ## V0.45 - nouvelle gestion des utilisateurs et surnom
analyse le markdown du fichier projet.md, qui contient tout le contexte nécessaire pour comprendre le projet de ma web app "poker tour", je veux apporter une évolution :
Je veux revoir la gestions des utilisateurs. Je veux qu'à la connexion si l'utilisateur n'a pas de surnom, lui demander d'en saisir un. L'utilisateur sera enregistré dans firebase avec un ID et son surnom.
Le surnom de l'utilisateur s'affiche ensuite à la place du nom utilisteur google dans la barre de menu.
Le surnom et l'id seront associés aux tournois, au parties et aux équipes pour afficher le surnom des joueurs quand cela est nécessaire.
On ne tient pas compte des données existantes, on considère qu'on repart de zéro pour adopter cette nouvelle gestion des utilisateurs.
Le succès est validé si l'évolution est réalisée sans affecter les autres fonctions existantes.
  
 ## V0.44 - afficher le nom des utilisateurs présent dans une équipe
analyse le markdown du fichier projet.md, qui contient le code des fichiers de ma web app "poker tour", je veux apporter une évolution :
Dans la vue des équipes de l'utilisateur, le nom des joueurs présents dans ses équipe doit être affiché.
Le succès est validé si l'évolution est réalisée sans affecter les fonctions existantes.
 
 ## V0.43 - joindre une équipe
analyse le markdown du fichier projet.md, qui contient le code des fichiers de ma web app "poker tour", je veux apporter une évolution :
Dans le menu Teams je veux ajouter la possibilité de joindre une équipe par son tag unique.
Un utilisateur n'étant pas déjà dans l'équipe qu'il veut rejoindre, peut saisir le tag unique de celle-ci pour la rejoindre.
Si le tag existe il peut alors la rejoindre et participer aux tournois de celle-ci, le tag n'existe pas ou n'est pas valide, il reçoit le message 'Equipe non valide ou inexistante'.
Le succès est validé si l'évolution est réalisée sans affecter les fonctions existantes.

## V0.44 - ajout des parties
analyse le markdown du fichier projet.md, qui contient le code des fichiers de ma web app "poker tour", je veux apporter une évolution :
Dans un tournoi je veux pouvoir ajouter une partie et sélectionner les participants.
Plusieurs parties peuvent être créées dans un tournoi.
La liste des partie associées à un trounoi sont affichées la vue tournois.
la gestion des parties est faite dans un fichier à part pour bien dissocier les fonctions.
Le succès est validé si l'évolution est réalisée sans affecter les fonctions existantes.


## resume projet
réécrit en markdown le fichier ci-joint qui inclue le code de tous les fichiers d'un projet d'une web app dans le but de transmettre le contexte et le contenu à une IA, il faut peut être retirer des choses inutiles, le but est d'avoir le meilleur ratio context / token afin de ne pas utiliser trop de token en requete input