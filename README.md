# 🚀 General Travel - Site de Réservation de Voyages

## 📋 Description
Application web complète de réservation de voyages incluant bus, hôtels et location de voitures.

## 🛠️ Technologies utilisées
- **Frontend :** HTML5, CSS3, JavaScript, Bootstrap 5
- **Backend :** Node.js, Express.js
- **Base de données :** MySQL
- **Authentification :** Sessions Express

## 🚀 Déploiement gratuit

### Option 1 : Render.com (Recommandé)

#### Étapes de déploiement :

1. **Créer un compte sur Render.com**
   - Allez sur [render.com](https://render.com)
   - Créez un compte gratuit

2. **Connecter votre repository GitHub**
   - Cliquez sur "New +" → "Web Service"
   - Connectez votre repository GitHub

3. **Configurer le service**
   - **Name :** `general-travel-backend`
   - **Environment :** `Node`
   - **Build Command :** `cd backend && npm install`
   - **Start Command :** `cd backend && npm start`

4. **Configurer les variables d'environnement**
   ```
   NODE_ENV=production
   PORT=10000
   DB_HOST=[votre-host-render]
   DB_USER=[votre-user-render]
   DB_PASSWORD=[votre-password-render]
   DB_NAME=general_travel
   SESSION_SECRET=votre_secret_ultra_secret
   ```

5. **Créer la base de données**
   - Cliquez sur "New +" → "PostgreSQL"
   - Configurez la base de données
   - Copiez les informations de connexion

6. **Initialiser la base de données**
   - Utilisez le script `backend/database.sql`
   - Ou connectez-vous via un client MySQL

### Option 2 : Railway.app

1. **Créer un compte sur Railway.app**
2. **Connecter votre repository**
3. **Configurer les variables d'environnement**
4. **Déployer automatiquement**

### Option 3 : Vercel (Frontend uniquement)

1. **Créer un compte sur Vercel.com**
2. **Connecter votre repository**
3. **Configurer le build**
4. **Déployer le frontend**

## 🔧 Configuration locale

### Prérequis
- Node.js (version 18+)
- MySQL
- Git

### Installation

1. **Cloner le repository**
   ```bash
   git clone [votre-repo-url]
   cd sergess
   ```

2. **Installer les dépendances backend**
   ```bash
   cd backend
   npm install
   ```

3. **Configurer la base de données**
   ```bash
   # Créer un fichier .env dans le dossier backend
   cp env.example .env
   # Modifier les variables dans .env
   ```

4. **Initialiser la base de données**
   ```bash
   mysql -u root -p < database.sql
   ```

5. **Démarrer le serveur**
   ```bash
   npm start
   ```

6. **Ouvrir le frontend**
   - Ouvrez `frontend/index.html` dans votre navigateur
   - Ou utilisez un serveur local comme Live Server

## 📁 Structure du projet

```
sergess/
├── backend/
│   ├── serveur.js          # Serveur Express
│   ├── package.json        # Dépendances Node.js
│   ├── database.sql        # Script de base de données
│   └── env.example         # Variables d'environnement
├── frontend/
│   ├── index.html          # Page d'accueil
│   ├── login.html          # Page de connexion
│   ├── register.html       # Page d'inscription
│   ├── user-dashboard.html # Tableau de bord utilisateur
│   ├── admin-dashboard.html # Tableau de bord admin
│   └── assets/             # Ressources statiques
└── render.yaml             # Configuration Render
```

## 🔐 Sécurité

- Les mots de passe sont hachés avec bcrypt
- Sessions sécurisées
- Validation des entrées utilisateur
- Protection CORS configurée

## 📞 Support

Pour toute question ou problème :
- Créez une issue sur GitHub
- Contactez l'équipe de développement

## 📄 Licence

Ce projet est sous licence MIT. 