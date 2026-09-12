# Bénévolat Annemasse Natation

Site du club avec calendrier public des événements et gestion des inscriptions bénévoles (postes limités en places, présences, récapitulatif de fin de saison).

Ce guide part du principe que vous ne codez pas — chaque étape se fait depuis un site web (GitHub, Supabase, Vercel).

---

## Étape 1 — Créer le projet Supabase

1. Allez sur [supabase.com](https://supabase.com), connectez-vous, cliquez **New project**.
2. Donnez-lui un nom (ex. `benevolat-annemasse-natation`), choisissez une région proche (Europe), définissez un mot de passe de base de données (notez-le, on ne s'en reservira pas ici mais gardez-le).
3. Une fois le projet créé, allez dans **SQL Editor** (menu de gauche) > **New query**.
4. Ouvrez le fichier `supabase/schema.sql` de ce projet, copiez tout son contenu, collez-le dans l'éditeur SQL, puis cliquez **Run**. Cela crée toutes les tables, la sécurité (RLS) et les règles nécessaires.
5. Allez dans **Project Settings** (icône en bas à gauche) > **API**. Notez deux valeurs, vous en aurez besoin à l'étape 3 :
   - **Project URL**
   - **anon public** key

## Étape 2 — Créer votre compte administrateur

1. Toujours dans Supabase, allez dans **Authentication** > **Users** > **Add user** > **Create new user**.
2. Renseignez votre email et un mot de passe. Cochez "Auto Confirm User" si la case existe (pour ne pas avoir besoin de confirmer par email).
3. C'est avec cet email/mot de passe que vous vous connecterez sur `/admin/connexion` une fois le site en ligne. Vous pourrez créer d'autres comptes admin de la même façon plus tard.

## Étape 3 — Mettre le code sur GitHub

1. Sur [github.com](https://github.com), créez un nouveau dépôt (bouton **New**), par exemple `benevolat-annemasse-natation`. Laissez-le vide (sans README, sans .gitignore — on les a déjà).
2. Sur la page du dépôt vide, GitHub propose **uploading an existing file** — cliquez dessus et glissez-déposez tous les fichiers et dossiers de ce projet (en conservant la structure : `src/`, `supabase/`, `package.json`, etc.).
3. Validez l'envoi ("Commit changes").

## Étape 4 — Déployer sur Vercel

1. Sur [vercel.com](https://vercel.com), connectez-vous avec votre compte GitHub.
2. Cliquez **Add New** > **Project**, puis choisissez le dépôt `benevolat-annemasse-natation` que vous venez de créer.
3. Vercel détecte automatiquement qu'il s'agit d'un projet Vite — laissez les réglages par défaut.
4. Avant de cliquer sur **Deploy**, ouvrez la section **Environment Variables** et ajoutez :
   - `VITE_SUPABASE_URL` = la Project URL notée à l'étape 1
   - `VITE_SUPABASE_ANON_KEY` = la clé anon public notée à l'étape 1
5. Cliquez **Deploy**. Au bout de quelques minutes, Vercel vous donne une adresse du type `benevolat-annemasse-natation.vercel.app` — c'est votre site en ligne.
6. Testez : ouvrez le site, allez sur **Espace admin**, connectez-vous avec le compte créé à l'étape 2.

À partir de maintenant, chaque fois que le code est modifié sur GitHub (par vous ou avec mon aide), Vercel redéploie automatiquement le site.

## Étape 5 — Activer la création d'autres administrateurs

Le site inclut un onglet **Administrateurs** dans l'espace admin, qui permet de créer un accès pour quelqu'un d'autre en choisissant vous-même son email et un mot de passe provisoire (aucun email n'est envoyé). Pour l'activer :

1. Dans Supabase, allez dans **Edge Functions** (menu de gauche) > **Deploy a new function**.
2. Nommez-la exactement `create-admin`.
3. Ouvrez le fichier `supabase/functions/create-admin/index.ts` de ce projet, copiez tout son contenu, et collez-le dans l'éditeur de la fonction (en remplaçant le contenu par défaut).
4. Déployez. Aucun réglage supplémentaire n'est nécessaire : Supabase fournit automatiquement à la fonction les clés dont elle a besoin.
5. Depuis l'espace admin du site, onglet **Administrateurs**, renseignez l'email de la personne et un mot de passe provisoire (un bouton "Générer" peut en proposer un), puis communiquez-lui vous-même ces deux informations pour qu'elle se connecte sur `/admin/connexion`.

Si la création échoue avec un message d'erreur, vérifiez d'abord que la fonction est bien déployée et nommée `create-admin` (Supabase > Edge Functions).

## Étape 6 — Ajouter vos premiers événements et adhérents

1. Connectez-vous à l'espace admin.
2. Onglet **Adhérents** : utilisez le bloc "Import en masse" pour coller votre liste (`Nom;Prénom;Groupe`, une ligne par personne) depuis votre fichier Excel/CSV.
3. Onglet **Calendrier** : créez vos événements, puis pour chacun créez le formulaire bénévole, ajoutez les postes nécessaires avec leur nombre de places, et ouvrez les inscriptions quand vous êtes prêt.

## Étape 7 — Intégrer le site sur annemasse-natation.com

Une fois l'adresse Vercel connue (ou un nom de domaine personnalisé branché dessus), voir la section 5 du cahier des charges pour le code d'intégration (iframe) à coller sur annemasse-natation.com.

---

## Développement local (optionnel)

Si un jour vous ou quelqu'un veut lancer le projet sur un ordinateur :

```bash
npm install
cp .env.example .env   # puis renseigner les valeurs Supabase
npm run dev
```

## Structure du projet

```
supabase/schema.sql                     script SQL complet (tables, sécurité, trigger de capacité)
supabase/functions/create-admin         fonction serveur pour créer d'autres comptes administrateurs
src/lib/                                connexion Supabase, formatage de dates
src/context/AuthContext                 gestion de la session admin
src/components/                         éléments réutilisables (formulaire d'inscription, etc.)
src/pages/PublicHome                    page d'accueil publique + calendrier
src/pages/AdminLogin                    connexion admin
src/pages/AdminCalendrier               gestion des événements, formulaires, postes, présences
src/pages/AdminAdherents                gestion des adhérents + import
src/pages/AdminRecap                    tableau récapitulatif des bénévoles
src/pages/AdminUsers                    inviter d'autres administrateurs
```
