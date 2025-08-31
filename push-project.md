 # Projet d'Évolution : PWA et Notifications Push pour PokerTour
 
 Ce document détaille les étapes nécessaires pour transformer l'application web PokerTour en une Progressive Web App (PWA) et pour y intégrer un système de notifications push via Firebase Cloud Messaging (FCM).
 
 **Objectifs :**
 1.  Rendre l'application installable sur les appareils des utilisateurs (mobile et bureau).
 2.  Permettre un fonctionnement hors-ligne de base.
 3.  Mettre en place des notifications push pour informer les joueurs d'événements importants (ex: fin d'un niveau de blind, début d'un tournoi).
 
 **Stack technique concernée :**
 *   Frontend : React avec Vite
 *   Backend : Firebase (Cloud Firestore, Cloud Functions, Cloud Messaging)
 
 ---
 
 ## Partie 1 : Transformation en Progressive Web App (PWA)
 
 L'objectif ici est de rendre votre application installable et de lui donner des capacités hors-ligne grâce à un Service Worker. Le plugin `vite-plugin-pwa` est l'outil idéal pour cela.
 
 ### Étape 1.1 : Installation et Configuration de `vite-plugin-pwa`
 
 1.  **Installez le plugin :**
     ```bash
     npm install vite-plugin-pwa -D
     ```
 
 2.  **Configurez `vite.config.js` :**
     Ajoutez le plugin à votre configuration Vite. Cela générera automatiquement le Service Worker et le fichier `manifest.json`.
 
     ```javascript
     import { defineConfig } from 'vite'
     import react from '@vitejs/plugin-react'
     import { VitePWA } from 'vite-plugin-pwa'
 
     export default defineConfig({
       plugins: [
         react(),
         VitePWA({
           registerType: 'autoUpdate',
           workbox: {
             globPatterns: ['**/*.{js,css,html,ico,png,svg}'] // Met en cache les assets essentiels
           },
           manifest: {
             name: 'PokerTour',
             short_name: 'PokerTour',
             description: 'Votre application de gestion de tournois de poker.',
             theme_color: '#A80000', // Couleur thème (rouge poker)
             background_color: '#F3F4F6', // Couleur de fond (poker-light)
             icons: [
               {
                 src: 'pwa-192x192.png',
                 sizes: '192x192',
                 type: 'image/png'
               },
               {
                 src: 'pwa-512x512.png',
                 sizes: '512x512',
                 type: 'image/png'
               },
               {
                 src: 'pwa-512x512.png',
                 sizes: '512x512',
                 type: 'image/png',
                 purpose: 'any maskable'
               }
             ]
           }
         })
       ]
     })
     ```
 
 ### Étape 1.2 : Création des icônes
 
 Vous devez créer les icônes `pwa-192x192.png` et `pwa-512x512.png` et les placer dans votre dossier `public`. Des outils comme favicon.io peuvent vous aider à générer les différentes tailles nécessaires.
 
 ### Étape 1.3 : Mise à jour de `index.html`
 
 Assurez-vous que votre fichier `public/index.html` contient les balises meta pour la PWA. Le plugin Vite s'occupera d'injecter le lien vers le manifest.
 
 ```html
 <head>
   ...
   <meta name="theme-color" content="#A80000">
   <title>PokerTour</title>
 </head>
 ```
 
 Une fois ces étapes terminées, après un `npm run build`, votre application sera une PWA installable !
 
 ---
 
 ## Partie 2 : Implémentation des Notifications Push (Côté Client)
 
 Nous allons utiliser Firebase Cloud Messaging (FCM) pour envoyer des notifications.
 
 ### Étape 2.1 : Fichier Service Worker pour FCM
 
 Créez un fichier `public/firebase-messaging-sw.js`. Ce fichier gérera la réception des notifications lorsque l'application est en arrière-plan.
 
 ```javascript
 // public/firebase-messaging-sw.js
 import { initializeApp } from "firebase/app";
 import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";
 
 const firebaseConfig = {
   apiKey: "...", // Vos clés depuis votre config Firebase
   authDomain: "...",
   projectId: "...",
   storageBucket: "...",
   messagingSenderId: "...",
   appId: "..."
 };
 
 const app = initializeApp(firebaseConfig);
 const messaging = getMessaging(app);
 
 onBackgroundMessage(messaging, (payload) => {
   console.log('[firebase-messaging-sw.js] Received background message ', payload);
 
   const notificationTitle = payload.notification.title;
   const notificationOptions = {
     body: payload.notification.body,
     icon: '/pwa-192x192.png'
   };
 
   self.registration.showNotification(notificationTitle, notificationOptions);
 });
 ```
 > **Note :** Vous devrez remplacer les valeurs de `firebaseConfig` par les vôtres.
 
 ### Étape 2.2 : Service pour gérer les notifications dans l'application React
 
 Créez un service pour encapsuler la logique FCM dans votre application React.
 
 ```javascript
 // src/services/push-notification-service.js
 import { getMessaging, getToken, onMessage } from "firebase/messaging";
 import { app } from "./firebase-config"; // Assurez-vous d'avoir un fichier de config central
 import { doc, setDoc, getFirestore } from "firebase/firestore";
 
 const messaging = getMessaging(app);
 const db = getFirestore(app);
 
 export const requestNotificationPermission = async (userId) => {
   console.log("Requesting notification permission...");
   const permission = await Notification.requestPermission();
 
   if (permission === "granted") {
     console.log("Notification permission granted.");
     try {
       const currentToken = await getToken(messaging, {
         vapidKey: "VOTRE_VAPID_KEY_DE_FIREBASE_CONSOLE",
       });
       if (currentToken) {
         console.log("FCM Token:", currentToken);
         await saveTokenToFirestore(userId, currentToken);
       } else {
         console.log("No registration token available. Request permission to generate one.");
       }
     } catch (err) {
       console.error("An error occurred while retrieving token. ", err);
     }
   } else {
     console.log("Unable to get permission to notify.");
   }
 };
 
 const saveTokenToFirestore = async (userId, token) => {
   if (!userId) return;
   const userRef = doc(db, "users", userId);
   await setDoc(userRef, { fcmToken: token }, { merge: true });
 };
 
 export const onForegroundMessage = () => {
   return new Promise((resolve) => {
     onMessage(messaging, (payload) => {
       console.log("Message received in foreground.", payload);
       resolve(payload);
     });
   });
 };
 ```
 > **Important :** Récupérez votre clé VAPID depuis la console Firebase > Project Settings > Cloud Messaging > Web configuration.
 
 ### Étape 2.3 : Intégration dans un composant React
 
 Dans un composant principal (par exemple `App.jsx` ou un layout), demandez la permission après la connexion de l'utilisateur.
 
 ```jsx
 // Exemple dans un composant
 import React, { useEffect } from 'react';
 import { useAuthStore } from './stores/authStore'; // En supposant que vous utilisez Zustand
 import { requestNotificationPermission, onForegroundMessage } from './services/push-notification-service';
 
 function NotificationManager() {
   const { user } = useAuthStore();
 
   useEffect(() => {
     if (user) {
       requestNotificationPermission(user.uid);
     }
   }, [user]);
 
   useEffect(() => {
     onForegroundMessage().then(payload => {
       // Affichez une notification/toast in-app ici
       alert(`New Notification: ${payload.notification.title}`);
     });
   }, []);
 
   return null; // Ce composant n'affiche rien
 }
 
 export default NotificationManager;
 ```
 
 ---
 
 ## Partie 3 : Déclenchement des Notifications (Côté Backend)
 
 Nous utiliserons une Cloud Function qui se déclenche sur un événement dans Firestore pour envoyer les notifications.
 
 ### Étape 3.1 : Scénario - Fin d'un niveau de blind
 
 Le déclencheur sera la mise à jour d'un document de partie (`game`) dans un tournoi. Lorsque le champ `currentLevel` change, nous enverrons une notification à tous les joueurs du tournoi.
 
 ### Étape 3.2 : Code de la Cloud Function
 
 Modifiez votre fichier `functions/src/index.ts`.
 
 ```typescript
 import * as functions from "firebase-functions";
 import * as admin from "firebase-admin";
 
 admin.initializeApp();
 
 const db = admin.firestore();
 const messaging = admin.messaging();
 
 export const onBlindLevelUp = functions.firestore
   .document("tournaments/{tournamentId}")
   .onUpdate(async (change, context) => {
     const beforeData = change.before.data();
     const afterData = change.after.data();
 
     // Trouvez la partie qui a changé de niveau
     const changedGame = afterData.games.find((game, index) => {
       const oldGame = beforeData.games[index];
       return oldGame && game.currentLevel > oldGame.currentLevel;
     });
 
     if (!changedGame) {
       console.log("No blind level change detected.");
       return null;
     }
 
     const tournamentName = afterData.name;
     const newLevel = changedGame.currentLevel + 1;
     const newBlinds = changedGame.blinds.small * (2 ** newLevel) + "/" + changedGame.blinds.big * (2 ** newLevel);
 
     // Récupérer les tokens FCM de tous les joueurs inscrits
     const playerIds = afterData.registrations
       .map((p: any) => p.id)
       .filter((id: string) => !id.startsWith("guest_"));
 
     if (playerIds.length === 0) {
       console.log("No registered users to notify.");
       return null;
     }
 
     const tokens: string[] = [];
     const userDocs = await db.collection("users").where(admin.firestore.FieldPath.documentId(), "in", playerIds).get();
 
     userDocs.forEach((doc) => {
       const userData = doc.data();
       if (userData.fcmToken) {
         tokens.push(userData.fcmToken);
       }
     });
 
     if (tokens.length === 0) {
       console.log("No FCM tokens found for registered users.");
       return null;
     }
 
     // Préparer la notification
     const payload = {
       notification: {
         title: `Niveau de blind augmenté dans ${tournamentName} !`,
         body: `Niveau ${newLevel}. Blinds : ${newBlinds}`,
         icon: "/pwa-192x192.png",
       },
     };
 
     // Envoyer les notifications
     console.log(`Sending notification to ${tokens.length} tokens.`);
     return messaging.sendToDevice(tokens, payload);
   });
 ```
 
 ### Étape 3.3 : Déploiement
 
 Depuis le répertoire racine de votre projet, déployez la fonction :
 
 ```bash
 firebase deploy --only functions
 ```
 
 ---
 
 ## Résumé
 
 1.  **PWA**: Utilisez `vite-plugin-pwa` pour rendre l'application installable et mettre en cache les assets.
 2.  **Client FCM**: Créez un `firebase-messaging-sw.js` pour les notifications en arrière-plan. Dans votre code React, demandez la permission à l'utilisateur, récupérez son token FCM et sauvegardez-le dans son document utilisateur sur Firestore.
 3.  **Backend FCM**: Créez une Cloud Function qui s'exécute lors de la mise à jour d'un tournoi, récupère les tokens des joueurs concernés et leur envoie une notification via FCM.
 
 Ce plan vous fournit une base solide pour implémenter ces fonctionnalités avancées et améliorer significativement votre application PokerTour.