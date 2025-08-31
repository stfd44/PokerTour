 # Détails de la Page d'Accueil (Dashboard) de PokerTour
 
 Ce document analyse et détaille les différents éléments prévus pour être affichés sur la page d'accueil de l'application PokerTour. Cette page sert de tableau de bord central pour l'utilisateur connecté.
 
 ## 1. Message de Bienvenue et Actions Principales
 
 En haut de la page, l'utilisateur est accueilli par :
 *   **Un titre principal :** "Bienvenue sur PokerTour".
 *   **Un slogan :** "Organisez et gérez vos tournois de poker comme un professionnel".
 
 Juste en dessous, deux boutons d'action principaux permettent une navigation rapide vers les fonctionnalités clés :
 *   **Créer un Tournoi :** Un bouton proéminent qui redirige l'utilisateur vers le formulaire de création de tournoi.
 *   **Rejoindre un Tournoi :** Un second bouton qui mène à la liste de tous les tournois disponibles, où l'utilisateur peut s'inscrire.
 
 ---
 
 ## 2. Section "Prochains Tournois"
 
 Cette section a pour but de mettre en avant les tournois à venir pour susciter l'engagement.
 
 *   **Contenu :** Affiche une liste des **3 prochains tournois** dont le statut est "prévu" (scheduled), triés par date.
 *   **Informations par tournoi :**
     *   Nom du tournoi.
     *   Date et heure.
     *   Lieu.
     *   Nombre de joueurs inscrits par rapport au maximum (`X / Y joueurs`).
     *   Un bouton pour **"Rejoindre"** ou **"Accéder"** au tournoi, qui redirige vers la page de détails du tournoi.
 
 > **Note :** Cette section est visible par tous les utilisateurs connectés, qu'ils soient inscrits ou non à ces tournois.
 
 ---
 
 ## 3. Section "Mes Tournois"
 
 Cette section est personnalisée pour l'utilisateur et lui donne un accès rapide aux tournois qui le concernent directement.
 
 *   **Condition d'affichage :** Cette section n'apparaît que si l'utilisateur est inscrit à au moins un tournoi.
 *   **Contenu :** Affiche la liste de tous les tournois auxquels l'utilisateur actuel est inscrit, quel que soit leur statut (prévu, en cours, terminé).
 *   **Informations par tournoi :** Similaires à la section "Prochains Tournois", avec des actions contextuelles :
     *   Nom du tournoi.
     *   Date, lieu, nombre de joueurs.
     *   Un bouton d'action qui change en fonction du statut du tournoi (`scheduled`, `in_progress`, `ended`) :
         *   **"Voir le résumé"** si le tournoi est terminé.
         *   **"Accéder"** si le tournoi est en cours.
         *   **"Rejoindre"** si le tournoi est encore à venir.
 
 ---
 
 ## En résumé
 
 La page d'accueil est conçue pour être un hub dynamique qui :
 1.  **Accueille** l'utilisateur.
 2.  Propose des **actions rapides** (créer/rejoindre).
 3.  Met en avant les **prochains événements** pour toute la communauté.
 4.  Offre un **accès personnalisé** aux événements de l'utilisateur.
 
 Tout le contenu est chargé dynamiquement à partir de la base de données Firestore et dépend de l'état de connexion de l'utilisateur et de ses inscriptions.