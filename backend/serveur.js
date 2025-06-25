// server.js

// 1. Charger les variables d'environnement depuis le fichier .env
require('dotenv').config();

// 2. Importer les modules nécessaires
const express = require('express');
const mysql = require('mysql2/promise'); // Utilise l'API basée sur les promesses pour async/await
const bcrypt = require('bcryptjs');
const cors = require('cors'); // Pour gérer les requêtes inter-origines
const session = require('express-session');

// 3. Initialiser l'application Express
const app = express();
const port = process.env.PORT || 3000; // Le port sur lequel votre serveur va écouter

// 4. Configurer les middlewares
app.use(express.json()); // Permet à Express de lire les corps de requêtes JSON
app.use(cors({
    origin: [
        'http://localhost:5500', 
        'http://127.0.0.1:5500',
        'https://your-frontend-domain.vercel.app', // Remplacer par votre domaine Vercel
        'https://your-frontend-domain.netlify.app'  // Remplacer par votre domaine Netlify
    ],
    credentials: true
})); // Active CORS pour permettre à votre frontend de communiquer avec ce backend
app.use(session({
    secret: 'votre_secret_ultra_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// 5. Configurer le pool de connexion MySQL
// Un pool de connexion est recommandé pour la production car il gère les connexions à la DB de manière efficace.
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10, // Nombre maximum de connexions simultanées
    queueLimit: 0       // Nombre maximum de requêtes en attente
});

// 6. Définir les points d'accès (routes) de l'API

// --- Point d'accès pour l'inscription (Register) ---
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    // Validation basique des entrées
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }

    try {
        // Vérifier si l'utilisateur existe déjà (par nom d'utilisateur ou email)
        const [existingUser] = await pool.execute(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({ message: 'Ce nom d\'utilisateur ou cet e-mail existe déjà.' });
        }

        // Hacher le mot de passe avant de le stocker
        // Le "salt" est une chaîne aléatoire ajoutée au mot de passe pour le rendre plus difficile à déchiffrer
        const salt = await bcrypt.genSalt(10); // Génère un salt avec 10 tours de hachage
        const hashedPassword = await bcrypt.hash(password, salt); // Hache le mot de passe

        // Insérer le nouvel utilisateur dans la base de données
        await pool.execute(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );

        res.status(201).json({ message: 'Inscription réussie !' });

    } catch (error) {
        console.error('Erreur lors de l\'inscription :', error);
        res.status(500).json({ message: 'Erreur serveur lors de l\'inscription.' });
    }
});

// --- Point d'accès pour la connexion (Login) ---
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Identifiants invalides' });
        }
        const user = rows[0];
        const valid = password === user.password;
        if (!valid) {
            return res.status(401).json({ success: false, message: 'Identifiants invalides' });
        }
        req.session.user = { id: user.id, email: user.email, role: user.role };
        return res.json({ success: true, role: user.role });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// Vérification de session
app.get('/profile', (req, res) => {
    if (req.session.user) {
        res.json({ logged: true, user: req.session.user });
    } else {
        res.status(401).json({ logged: false });
    }
});

// Déconnexion
app.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

// Suppression d'un utilisateur (admin)
app.delete('/api/admin/users/:id', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.status(401).json({ error: 'Non autorisé' });
  try {
    // Vérifier que l'utilisateur n'essaie pas de se supprimer lui-même
    if (parseInt(req.params.id) === req.session.user.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }
    
    // Vérifier que l'utilisateur existe
    const [user] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (user.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    // Supprimer d'abord les réservations de l'utilisateur
    await pool.execute('DELETE FROM reservations WHERE user_id = ?', [req.params.id]);
    
    // Puis supprimer l'utilisateur
    await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Utilisateur supprimé avec succès' });
  } catch (e) {
    console.error('Erreur lors de la suppression:', e);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression' });
  }
});

// Suppression d'une réservation (admin)
app.delete('/api/admin/reservations/:id', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.status(401).json({ error: 'Non autorisé' });
  try {
    await pool.execute('DELETE FROM reservations WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Création d'une réservation (user ou admin)
app.post('/api/user/reservations', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Non autorisé' });
  const { type, destination, date, statut, prix } = req.body;
  try {
    await pool.execute(
      'INSERT INTO reservations (user_id, type, destination, date, statut, prix) VALUES (?, ?, ?, ?, ?, ?)',
      [req.session.user.id, type, destination, date, statut || 'Confirmée', prix || 0]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modification d'une réservation (user ou admin)
app.put('/api/user/reservations/:id', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Non autorisé' });
  const { type, destination, date, statut, prix } = req.body;
  try {
    let query = 'UPDATE reservations SET type=?, destination=?, date=?, statut=?, prix=? WHERE id=?';
    let params = [type, destination, date, statut, prix, req.params.id];
    if (req.session.user.role !== 'admin') {
      query += ' AND user_id=?';
      params.push(req.session.user.id);
    }
    const [result] = await pool.execute(query, params);
    if (result.affectedRows === 0) return res.status(403).json({ error: 'Non autorisé' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// === API réservation bus ===

// Recherche de trajets
app.get('/api/trips', async (req, res) => {
  let { departure, destination, date } = req.query;
  // Considère les champs vides comme absents
  departure = departure && departure.trim() !== '' ? departure : null;
  destination = destination && destination.trim() !== '' ? destination : null;
  date = date && date.trim() !== '' ? date : null;
  try {
    let rows;
    if (!departure && !destination && !date) {
      // Aucun filtre : retourne tous les trajets
      [rows] = await pool.execute(`SELECT * FROM trips`);
    } else if (departure && destination && date) {
      // Tous les filtres présents
      [rows] = await pool.execute(
        `SELECT * FROM trips WHERE departure=? AND destination=? AND date=?`,
        [departure, destination, date]
      );
    } else {
      // Filtres partiels : construit dynamiquement
      let query = 'SELECT * FROM trips WHERE 1=1';
      let params = [];
      if (departure) { query += ' AND departure=?'; params.push(departure); }
      if (destination) { query += ' AND destination=?'; params.push(destination); }
      if (date) { query += ' AND date=?'; params.push(date); }
      [rows] = await pool.execute(query, params);
    }
    // Transforme les features en tableau
    const trips = rows.map(trip => ({
      ...trip,
      features: trip.features ? trip.features.split(',') : []
    }));
    res.json(trips);
  } catch (e) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Sièges occupés pour un trajet/date
app.get('/api/trips/:id/seats', async (req, res) => {
  const { id } = req.params;
  const { date } = req.query;
  if (!date) return res.status(400).json({ message: 'Date manquante' });
  try {
    const [rows] = await pool.execute(
      `SELECT seat_number FROM bookings WHERE trip_id=? AND date=?`,
      [id, date]
    );
    res.json(rows.map(r => r.seat_number));
  } catch (e) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Réservation
app.post('/api/bookings', async (req, res) => {
  const { tripId, date, seats, firstName, lastName, email, phone, comments } = req.body;
  if (!tripId || !date || !seats || !firstName || !lastName || !email) {
    return res.json({ success: false, message: 'Champs manquants' });
  }
  try {
    // Vérifier que les sièges sont libres
    const [occupied] = await pool.execute(
      `SELECT seat_number FROM bookings WHERE trip_id=? AND date=? AND seat_number IN (${seats.map(() => '?').join(',')})`,
      [tripId, date, ...seats]
    );
    if (occupied.length > 0) {
      return res.json({ success: false, message: 'Un ou plusieurs sièges déjà réservés' });
    }
    // Générer une référence unique
    const bookingRef = 'BT' + Math.random().toString(36).substr(2, 8).toUpperCase();
    // Insérer chaque siège réservé
    for (const seat of seats) {
      await pool.execute(
        `INSERT INTO bookings (trip_id, date, seat_number, first_name, last_name, email, phone, comments, booking_ref)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tripId, date, seat, firstName, lastName, email, phone, comments, bookingRef]
      );
    }
    res.json({ success: true, bookingRef });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// === ADMIN : Gestion des trajets ===

// Ajouter un trajet
app.post('/api/admin/trips', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.status(401).json({ error: 'Non autorisé' });
  const { departure, destination, date, departure_time, arrival_time, duration, price, company, features } = req.body;
  if (!departure || !destination || !date || !departure_time || !arrival_time || !duration || !price || !company) {
    return res.status(400).json({ error: 'Champs manquants' });
  }
  try {
    await pool.execute(
      `INSERT INTO trips (departure, destination, date, departure_time, arrival_time, duration, price, company, features)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [departure, destination, date, departure_time, arrival_time, duration, price, company, (features || []).join(',')]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modifier un trajet
app.put('/api/admin/trips/:id', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.status(401).json({ error: 'Non autorisé' });
  const { departure, destination, date, departure_time, arrival_time, duration, price, company, features } = req.body;
  try {
    await pool.execute(
      `UPDATE trips SET departure=?, destination=?, date=?, departure_time=?, arrival_time=?, duration=?, price=?, company=?, features=? WHERE id=?`,
      [departure, destination, date, departure_time, arrival_time, duration, price, company, (features || []).join(','), req.params.id]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un trajet
app.delete('/api/admin/trips/:id', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.status(401).json({ error: 'Non autorisé' });
  try {
    await pool.execute('DELETE FROM trips WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// === ADMIN : Initialisation de trajets fictifs Cameroun ===
app.get('/api/admin/init-trips', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.status(401).json({ error: 'Non autorisé' });
  const trips = [
    { departure: 'YAOUNDE', destination: 'DOUALA', date: '2024-07-01', departure_time: '08:00', arrival_time: '12:00', duration: '4h00', price: 7000, company: 'General Travel', features: 'WiFi,Prises' },
    { departure: 'DOUALA', destination: 'YAOUNDE', date: '2024-07-01', departure_time: '14:00', arrival_time: '18:00', duration: '4h00', price: 7000, company: 'General Travel', features: 'WiFi,Climatisation' },
    { departure: 'YAOUNDE', destination: 'BAFOUSSAM', date: '2024-07-01', departure_time: '09:00', arrival_time: '13:30', duration: '4h30', price: 8000, company: 'Express Voyages', features: 'WiFi,Toilettes' },
    { departure: 'BAFOUSSAM', destination: 'YAOUNDE', date: '2024-07-01', departure_time: '15:00', arrival_time: '19:30', duration: '4h30', price: 8000, company: 'Express Voyages', features: 'Climatisation,Prises' },
    { departure: 'DOUALA', destination: 'DSCHANG', date: '2024-07-01', departure_time: '07:30', arrival_time: '12:00', duration: '4h30', price: 9000, company: 'Finexs', features: 'WiFi,Prises' },
    { departure: 'DSCHANG', destination: 'DOUALA', date: '2024-07-01', departure_time: '13:00', arrival_time: '17:30', duration: '4h30', price: 9000, company: 'Finexs', features: 'Climatisation,Toilettes' },
    { departure: 'YAOUNDE', destination: 'BOUDA', date: '2024-07-01', departure_time: '06:00', arrival_time: '12:00', duration: '6h00', price: 12000, company: 'Touristique Express', features: 'WiFi,Prises,Climatisation' },
    { departure: 'BOUDA', destination: 'YAOUNDE', date: '2024-07-01', departure_time: '13:30', arrival_time: '19:30', duration: '6h00', price: 12000, company: 'Touristique Express', features: 'WiFi,Toilettes' },
    { departure: 'DOUALA', destination: 'BAFOUSSAM', date: '2024-07-01', departure_time: '10:00', arrival_time: '14:30', duration: '4h30', price: 8500, company: 'General Travel', features: 'WiFi,Climatisation' },
    { departure: 'BAFOUSSAM', destination: 'DOUALA', date: '2024-07-01', departure_time: '16:00', arrival_time: '20:30', duration: '4h30', price: 8500, company: 'General Travel', features: 'Prises,Toilettes' }
  ];
  try {
    for (const t of trips) {
      await pool.execute(
        `INSERT INTO trips (departure, destination, date, departure_time, arrival_time, duration, price, company, features)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [t.departure, t.destination, t.date, t.departure_time, t.arrival_time, t.duration, t.price, t.company, t.features]
      );
    }
    res.json({ success: true, message: 'Trajets fictifs insérés.' });
  } catch (e) {
    res.status(500).json({ error: 'Erreur lors de l\'insertion.' });
  }
});

// Récupération de tous les utilisateurs (admin)
app.get('/api/admin/users', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.status(401).json({ error: 'Non autorisé' });
  try {
    const [users] = await pool.execute(`
      SELECT id, username, email, role, created_at 
      FROM users 
      ORDER BY created_at DESC
    `);
    res.json(users);
  } catch (e) {
    console.error('Erreur lors de la récupération des utilisateurs:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupération des détails d'un utilisateur spécifique (admin)
app.get('/api/admin/users/:id', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.status(401).json({ error: 'Non autorisé' });
  try {
    const [users] = await pool.execute(`
      SELECT id, username, email, role, created_at 
      FROM users 
      WHERE id = ?
    `, [req.params.id]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    // Récupérer les réservations de l'utilisateur
    const [reservations] = await pool.execute(`
      SELECT * FROM reservations WHERE user_id = ? ORDER BY date DESC
    `, [req.params.id]);
    
    const user = users[0];
    user.reservations = reservations;
    
    res.json(user);
  } catch (e) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupération de toutes les réservations (admin)
app.get('/api/admin/reservations', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.status(401).json({ error: 'Non autorisé' });
  try {
    const [reservations] = await pool.execute(`
      SELECT r.*, u.username, u.email 
      FROM reservations r 
      LEFT JOIN users u ON r.user_id = u.id 
      ORDER BY r.date DESC
    `);
    res.json(reservations);
  } catch (e) {
    console.error('Erreur lors de la récupération des réservations:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Statistiques pour le dashboard admin
app.get('/api/admin/stats', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.status(401).json({ error: 'Non autorisé' });
  try {
    // Nombre total d'utilisateurs
    const [userCount] = await pool.execute('SELECT COUNT(*) as count FROM users');
    
    // Nombre total de réservations
    const [reservationCount] = await pool.execute('SELECT COUNT(*) as count FROM reservations');
    
    // Revenus totaux
    const [revenueResult] = await pool.execute('SELECT SUM(prix) as total FROM reservations WHERE statut = "Confirmée"');
    
    // Répartition par type de réservation
    const [typeStats] = await pool.execute(`
      SELECT type, COUNT(*) as count 
      FROM reservations 
      GROUP BY type
    `);
    
    // Utilisateurs récents (derniers 7 jours)
    const [recentUsers] = await pool.execute(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);
    
    // Réservations récentes (derniers 7 jours)
    const [recentReservations] = await pool.execute(`
      SELECT COUNT(*) as count 
      FROM reservations 
      WHERE date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);
    
    // Revenus récents (derniers 7 jours)
    const [recentRevenue] = await pool.execute(`
      SELECT SUM(prix) as total 
      FROM reservations 
      WHERE statut = "Confirmée" AND date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);
    
    // Statistiques par statut
    const [statusStats] = await pool.execute(`
      SELECT statut, COUNT(*) as count 
      FROM reservations 
      GROUP BY statut
    `);
    
    // Top 5 destinations les plus populaires
    const [topDestinations] = await pool.execute(`
      SELECT destination, COUNT(*) as count 
      FROM reservations 
      GROUP BY destination 
      ORDER BY count DESC 
      LIMIT 5
    `);
    
    // Statistiques mensuelles (derniers 6 mois)
    const [monthlyStats] = await pool.execute(`
      SELECT 
        DATE_FORMAT(date, '%Y-%m') as month,
        COUNT(*) as reservations,
        SUM(CASE WHEN statut = 'Confirmée' THEN prix ELSE 0 END) as revenue
      FROM reservations 
      WHERE date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(date, '%Y-%m')
      ORDER BY month DESC
    `);
    
    // Taux de conversion (réservations confirmées / total)
    const [conversionRate] = await pool.execute(`
      SELECT 
        ROUND((COUNT(CASE WHEN statut = 'Confirmée' THEN 1 END) * 100.0 / COUNT(*)), 2) as rate
      FROM reservations
    `);
    
    // Utilisateurs actifs (avec au moins une réservation)
    const [activeUsers] = await pool.execute(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM reservations
    `);
    
    // Moyenne des réservations par utilisateur
    const [avgReservationsPerUser] = await pool.execute(`
      SELECT ROUND(AVG(reservation_count), 2) as avg
      FROM (
        SELECT user_id, COUNT(*) as reservation_count
        FROM reservations
        GROUP BY user_id
      ) as user_stats
    `);
    
    res.json({
      // Statistiques générales
      totalUsers: userCount[0].count,
      totalReservations: reservationCount[0].count,
      revenus: revenueResult[0].total || 0,
      conversionRate: conversionRate[0].rate || 0,
      activeUsers: activeUsers[0].count,
      avgReservationsPerUser: avgReservationsPerUser[0].avg || 0,
      
      // Statistiques récentes
      recentUsers: recentUsers[0].count,
      recentReservations: recentReservations[0].count,
      recentRevenue: recentRevenue[0].total || 0,
      
      // Répartitions
      typeStats: typeStats,
      statusStats: statusStats,
      topDestinations: topDestinations,
      
      // Évolution temporelle
      monthlyStats: monthlyStats
    });
  } catch (e) {
    console.error('Erreur lors de la récupération des statistiques:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modification d'un utilisateur (admin)
app.put('/api/admin/users/:id', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.status(401).json({ error: 'Non autorisé' });
  const { username, email, role, password } = req.body;
  
  try {
    // Vérifier que l'utilisateur existe
    const [existingUser] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (existingUser.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    // Vérifier que l'email n'est pas déjà utilisé par un autre utilisateur
    if (email && email !== existingUser[0].email) {
      const [emailCheck] = await pool.execute('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.params.id]);
      if (emailCheck.length > 0) {
        return res.status(409).json({ error: 'Cet email est déjà utilisé' });
      }
    }
    
    // Préparer la requête de mise à jour
    let query = 'UPDATE users SET username = ?, email = ?, role = ?';
    let params = [username || existingUser[0].username, email || existingUser[0].email, role || existingUser[0].role];
    
    // Si un nouveau mot de passe est fourni, l'ajouter à la mise à jour
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      query += ', password = ?';
      params.push(hashedPassword);
    }
    
    query += ' WHERE id = ?';
    params.push(req.params.id);
    
    // Mettre à jour l'utilisateur
    await pool.execute(query, params);
    
    res.json({ success: true, message: 'Utilisateur modifié avec succès' });
  } catch (e) {
    console.error('Erreur lors de la modification:', e);
    res.status(500).json({ error: 'Erreur serveur lors de la modification' });
  }
});

// Création d'un nouvel utilisateur (admin)
app.post('/api/admin/users', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.status(401).json({ error: 'Non autorisé' });
  const { username, email, password, role } = req.body;

  // Validation des entrées
  if (!username || !email || !password || !role) {
    return res.status(400).json({ error: 'Tous les champs sont requis.' });
  }

  try {
    // Vérifier si l'utilisateur existe déjà
    const [existingUser] = await pool.execute(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'Ce nom d\'utilisateur ou cet e-mail existe déjà.' });
    }

    // Hacher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insérer le nouvel utilisateur
    await pool.execute(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, role]
    );

    res.status(201).json({ success: true, message: 'Utilisateur créé avec succès' });

  } catch (error) {
    console.error('Erreur lors de la création:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création' });
  }
});

// === API UTILISATEUR ===

// Statistiques pour le dashboard utilisateur
app.get('/api/user/stats', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Non autorisé' });
  try {
    // Nombre total de réservations de l'utilisateur
    const [reservationCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM reservations WHERE user_id = ?',
      [req.session.user.id]
    );
    
    // Nombre de destinations uniques visitées
    const [destinationsResult] = await pool.execute(
      'SELECT COUNT(DISTINCT destination) as count FROM reservations WHERE user_id = ?',
      [req.session.user.id]
    );
    
    // Points fidélité (calcul basique : 100 points par réservation confirmée)
    const [confirmedReservations] = await pool.execute(
      'SELECT COUNT(*) as count FROM reservations WHERE user_id = ? AND statut = "Confirmée"',
      [req.session.user.id]
    );
    
    // Montant total dépensé
    const [totalSpent] = await pool.execute(
      'SELECT SUM(prix) as total FROM reservations WHERE user_id = ? AND statut = "Confirmée"',
      [req.session.user.id]
    );
    
    // Réservations récentes (derniers 30 jours)
    const [recentReservations] = await pool.execute(
      'SELECT COUNT(*) as count FROM reservations WHERE user_id = ? AND date >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
      [req.session.user.id]
    );
    
    // Répartition par type de réservation
    const [typeStats] = await pool.execute(
      'SELECT type, COUNT(*) as count FROM reservations WHERE user_id = ? GROUP BY type',
      [req.session.user.id]
    );
    
    // Répartition par statut
    const [statusStats] = await pool.execute(
      'SELECT statut, COUNT(*) as count FROM reservations WHERE user_id = ? GROUP BY statut',
      [req.session.user.id]
    );
    
    // Destinations favorites (top 3)
    const [favoriteDestinations] = await pool.execute(
      'SELECT destination, COUNT(*) as count FROM reservations WHERE user_id = ? GROUP BY destination ORDER BY count DESC LIMIT 3',
      [req.session.user.id]
    );
    
    // Statistiques mensuelles (derniers 6 mois)
    const [monthlyStats] = await pool.execute(
      `SELECT 
        DATE_FORMAT(date, '%Y-%m') as month,
        COUNT(*) as reservations,
        SUM(CASE WHEN statut = 'Confirmée' THEN prix ELSE 0 END) as spent
      FROM reservations 
      WHERE user_id = ? AND date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(date, '%Y-%m')
      ORDER BY month DESC`,
      [req.session.user.id]
    );
    
    // Taux de confirmation personnel
    const [personalConversionRate] = await pool.execute(
      'SELECT ROUND((COUNT(CASE WHEN statut = "Confirmée" THEN 1 END) * 100.0 / COUNT(*)), 2) as rate FROM reservations WHERE user_id = ?',
      [req.session.user.id]
    );
    
    // Date de la première réservation
    const [firstReservation] = await pool.execute(
      'SELECT MIN(date) as first_date FROM reservations WHERE user_id = ?',
      [req.session.user.id]
    );
    
    // Date de la dernière réservation
    const [lastReservation] = await pool.execute(
      'SELECT MAX(date) as last_date FROM reservations WHERE user_id = ?',
      [req.session.user.id]
    );
    
    const points = confirmedReservations[0].count * 100;
    
    res.json({
      // Statistiques générales
      totalReservations: reservationCount[0].count,
      destinationsVisited: destinationsResult[0].count,
      points: points,
      totalSpent: totalSpent[0].total || 0,
      conversionRate: personalConversionRate[0].rate || 0,
      
      // Statistiques récentes
      recentReservations: recentReservations[0].count,
      
      // Répartitions
      typeStats: typeStats,
      statusStats: statusStats,
      favoriteDestinations: favoriteDestinations,
      
      // Évolution temporelle
      monthlyStats: monthlyStats,
      
      // Dates importantes
      firstReservation: firstReservation[0].first_date,
      lastReservation: lastReservation[0].last_date
    });
  } catch (e) {
    console.error('Erreur lors de la récupération des statistiques utilisateur:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupération des réservations de l'utilisateur
app.get('/api/user/reservations', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Non autorisé' });
  try {
    const [reservations] = await pool.execute(`
      SELECT * FROM reservations 
      WHERE user_id = ? 
      ORDER BY date DESC
    `, [req.session.user.id]);
    res.json(reservations);
  } catch (e) {
    console.error('Erreur lors de la récupération des réservations:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modification d'une réservation (utilisateur)
app.put('/api/user/reservations/:id', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Non autorisé' });
  const { type, destination, date, statut, prix } = req.body;
  try {
    const [result] = await pool.execute(
      'UPDATE reservations SET type=?, destination=?, date=?, statut=?, prix=? WHERE id=? AND user_id=?',
      [type, destination, date, statut, prix || 0, req.params.id, req.session.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(403).json({ error: 'Réservation non trouvée ou non autorisée' });
    }
    res.json({ success: true, message: 'Réservation modifiée avec succès' });
  } catch (e) {
    console.error('Erreur lors de la modification:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Suppression d'une réservation (utilisateur)
app.delete('/api/user/reservations/:id', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Non autorisé' });
  try {
    const [result] = await pool.execute(
      'DELETE FROM reservations WHERE id=? AND user_id=?',
      [req.params.id, req.session.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(403).json({ error: 'Réservation non trouvée ou non autorisée' });
    }
    res.json({ success: true, message: 'Réservation supprimée avec succès' });
  } catch (e) {
    console.error('Erreur lors de la suppression:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// === API HÔTELS ===

// Récupération de tous les hôtels
app.get('/api/hotels', async (req, res) => {
  let { city, checkIn, checkOut, guests } = req.query;
  
  try {
    let query = 'SELECT * FROM hotels WHERE 1=1';
    let params = [];
    
    if (city && city.trim() !== '') {
      query += ' AND city LIKE ?';
      params.push(`%${city}%`);
    }
    
    if (checkIn && checkIn.trim() !== '') {
      query += ' AND available_from <= ?';
      params.push(checkIn);
    }
    
    if (checkOut && checkOut.trim() !== '') {
      query += ' AND available_to >= ?';
      params.push(checkOut);
    }
    
    if (guests && guests.trim() !== '') {
      query += ' AND capacity >= ?';
      params.push(parseInt(guests));
    }
    
    query += ' ORDER BY rating DESC, price ASC';
    
    const [hotels] = await pool.execute(query, params);
    res.json(hotels);
  } catch (e) {
    console.error('Erreur lors de la récupération des hôtels:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupération des chambres disponibles pour un hôtel
app.get('/api/hotels/:id/rooms', async (req, res) => {
  const { checkIn, checkOut, guests } = req.query;
  
  try {
    let query = `
      SELECT r.*, h.name as hotel_name, h.city 
      FROM rooms r 
      JOIN hotels h ON r.hotel_id = h.id 
      WHERE r.hotel_id = ? AND r.available = 1
    `;
    let params = [req.params.id];
    
    if (guests && guests.trim() !== '') {
      query += ' AND r.capacity >= ?';
      params.push(parseInt(guests));
    }
    
    const [rooms] = await pool.execute(query, params);
    res.json(rooms);
  } catch (e) {
    console.error('Erreur lors de la récupération des chambres:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Réservation d'hôtel
app.post('/api/hotel-bookings', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Non autorisé' });
  
  const { hotelId, roomId, checkIn, checkOut, guests, guestName, guestEmail, guestPhone } = req.body;
  
  try {
    // Vérifier que la chambre est disponible
    const [room] = await pool.execute('SELECT * FROM rooms WHERE id = ? AND available = 1', [roomId]);
    if (room.length === 0) {
      return res.status(400).json({ error: 'Chambre non disponible' });
    }
    
    // Calculer le prix total
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const totalPrice = room[0].price_per_night * nights;
    
    // Créer la réservation
    const [result] = await pool.execute(
      'INSERT INTO reservations (user_id, type, destination, date, statut, prix, details) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        req.session.user.id,
        'Hôtel',
        room[0].hotel_name || 'Hôtel',
        checkIn,
        'Confirmée',
        totalPrice,
        JSON.stringify({
          hotelId,
          roomId,
          checkIn,
          checkOut,
          guests,
          guestName,
          guestEmail,
          guestPhone,
          nights,
          roomType: room[0].type
        })
      ]
    );
    
    // Marquer la chambre comme occupée pour ces dates
    await pool.execute(
      'UPDATE rooms SET available = 0 WHERE id = ?',
      [roomId]
    );
    
    res.json({ 
      success: true, 
      bookingRef: `HOTEL-${Date.now()}-${result.insertId}`,
      totalPrice,
      nights
    });
  } catch (e) {
    console.error('Erreur lors de la réservation hôtel:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// === API VOITURES ===

// Récupération de toutes les voitures
app.get('/api/cars', async (req, res) => {
  let { city, pickupDate, returnDate, passengers } = req.query;
  
  try {
    let query = 'SELECT * FROM cars WHERE 1=1';
    let params = [];
    
    if (city && city.trim() !== '') {
      query += ' AND location LIKE ?';
      params.push(`%${city}%`);
    }
    
    if (pickupDate && pickupDate.trim() !== '') {
      query += ' AND available_from <= ?';
      params.push(pickupDate);
    }
    
    if (returnDate && returnDate.trim() !== '') {
      query += ' AND available_to >= ?';
      params.push(returnDate);
    }
    
    if (passengers && passengers.trim() !== '') {
      query += ' AND seats >= ?';
      params.push(parseInt(passengers));
    }
    
    query += ' ORDER BY price_per_day ASC';
    
    const [cars] = await pool.execute(query, params);
    res.json(cars);
  } catch (e) {
    console.error('Erreur lors de la récupération des voitures:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Réservation de voiture
app.post('/api/car-bookings', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Non autorisé' });
  
  const { carId, pickupDate, returnDate, pickupLocation, returnLocation, driverName, driverLicense, driverPhone } = req.body;
  
  try {
    // Vérifier que la voiture est disponible
    const [car] = await pool.execute('SELECT * FROM cars WHERE id = ? AND available = 1', [carId]);
    if (car.length === 0) {
      return res.status(400).json({ error: 'Voiture non disponible' });
    }
    
    // Calculer le prix total
    const pickup = new Date(pickupDate);
    const return_ = new Date(returnDate);
    const days = Math.ceil((return_ - pickup) / (1000 * 60 * 60 * 24));
    const totalPrice = car[0].price_per_day * days;
    
    // Créer la réservation
    const [result] = await pool.execute(
      'INSERT INTO reservations (user_id, type, destination, date, statut, prix, details) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        req.session.user.id,
        'Voiture',
        car[0].model || 'Voiture',
        pickupDate,
        'Confirmée',
        totalPrice,
        JSON.stringify({
          carId,
          pickupDate,
          returnDate,
          pickupLocation,
          returnLocation,
          driverName,
          driverLicense,
          driverPhone,
          days,
          carModel: car[0].model,
          carBrand: car[0].brand
        })
      ]
    );
    
    // Marquer la voiture comme occupée pour ces dates
    await pool.execute(
      'UPDATE cars SET available = 0 WHERE id = ?',
      [carId]
    );
    
    res.json({ 
      success: true, 
      bookingRef: `CAR-${Date.now()}-${result.insertId}`,
      totalPrice,
      days
    });
  } catch (e) {
    console.error('Erreur lors de la réservation voiture:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// === ROUTE D'INITIALISATION POUR HÔTELS ET VOITURES ===

// Initialisation des hôtels et voitures (admin seulement)
app.post('/api/init-hotels-cars', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  
  try {
    // Créer la table hotels si elle n'existe pas
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS hotels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        city VARCHAR(100) NOT NULL,
        address TEXT,
        rating DECIMAL(2,1) DEFAULT 0.0,
        price_per_night DECIMAL(10,2) NOT NULL,
        capacity INT DEFAULT 2,
        available_from DATE,
        available_to DATE,
        amenities TEXT,
        image_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Créer la table rooms si elle n'existe pas
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        hotel_id INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        capacity INT DEFAULT 2,
        price_per_night DECIMAL(10,2) NOT NULL,
        available BOOLEAN DEFAULT 1,
        room_number VARCHAR(20),
        floor INT,
        FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
      )
    `);
    
    // Créer la table cars si elle n'existe pas
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS cars (
        id INT AUTO_INCREMENT PRIMARY KEY,
        brand VARCHAR(100) NOT NULL,
        model VARCHAR(100) NOT NULL,
        year INT,
        seats INT DEFAULT 5,
        transmission VARCHAR(20) DEFAULT 'Manuelle',
        fuel_type VARCHAR(20) DEFAULT 'Essence',
        price_per_day DECIMAL(10,2) NOT NULL,
        location VARCHAR(100) NOT NULL,
        available BOOLEAN DEFAULT 1,
        available_from DATE,
        available_to DATE,
        image_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insérer des hôtels fictifs
    const hotels = [
      {
        name: 'Hôtel Royal Douala',
        city: 'Douala',
        address: 'Avenue de l\'Indépendance, Douala',
        rating: 4.5,
        price_per_night: 45000,
        capacity: 4,
        amenities: 'WiFi, Piscine, Restaurant, SPA',
        image_url: 'assets/img/hotel1.jpg'
      },
      {
        name: 'Hôtel Yaoundé Palace',
        city: 'Yaoundé',
        address: 'Boulevard du 20 Mai, Yaoundé',
        rating: 4.2,
        price_per_night: 38000,
        capacity: 3,
        amenities: 'WiFi, Restaurant, Bar, Parking',
        image_url: 'assets/img/hotel2.jpg'
      },
      {
        name: 'Hôtel Bafoussam Resort',
        city: 'Bafoussam',
        address: 'Route de Bamenda, Bafoussam',
        rating: 3.8,
        price_per_night: 28000,
        capacity: 2,
        amenities: 'WiFi, Restaurant, Jardin',
        image_url: 'assets/img/hotel3.jpg'
      },
      {
        name: 'Hôtel Garoua Central',
        city: 'Garoua',
        address: 'Place de l\'Indépendance, Garoua',
        rating: 3.5,
        price_per_night: 22000,
        capacity: 2,
        amenities: 'WiFi, Restaurant',
        image_url: 'assets/img/hotel4.jpg'
      }
    ];
    
    for (const hotel of hotels) {
      const [result] = await pool.execute(
        'INSERT INTO hotels (name, city, address, rating, price_per_night, capacity, amenities, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [hotel.name, hotel.city, hotel.address, hotel.rating, hotel.price_per_night, hotel.capacity, hotel.amenities, hotel.image_url]
      );
      
      // Ajouter des chambres pour chaque hôtel
      const roomTypes = ['Standard', 'Supérieure', 'Suite'];
      for (let i = 0; i < roomTypes.length; i++) {
        await pool.execute(
          'INSERT INTO rooms (hotel_id, type, capacity, price_per_night, room_number, floor) VALUES (?, ?, ?, ?, ?, ?)',
          [
            result.insertId,
            roomTypes[i],
            hotel.capacity,
            hotel.price_per_night + (i * 5000),
            `${i + 1}01`,
            i + 1
          ]
        );
      }
    }
    
    // Insérer des voitures fictives
    const cars = [
      {
        brand: 'Toyota',
        model: 'Corolla',
        year: 2022,
        seats: 5,
        transmission: 'Automatique',
        fuel_type: 'Essence',
        price_per_day: 15000,
        location: 'Douala'
      },
      {
        brand: 'Honda',
        model: 'Civic',
        year: 2021,
        seats: 5,
        transmission: 'Manuelle',
        fuel_type: 'Essence',
        price_per_day: 12000,
        location: 'Yaoundé'
      },
      {
        brand: 'Nissan',
        model: 'X-Trail',
        year: 2023,
        seats: 7,
        transmission: 'Automatique',
        fuel_type: 'Diesel',
        price_per_day: 25000,
        location: 'Douala'
      },
      {
        brand: 'Suzuki',
        model: 'Swift',
        year: 2022,
        seats: 5,
        transmission: 'Manuelle',
        fuel_type: 'Essence',
        price_per_day: 10000,
        location: 'Bafoussam'
      },
      {
        brand: 'Hyundai',
        model: 'Tucson',
        year: 2023,
        seats: 5,
        transmission: 'Automatique',
        fuel_type: 'Essence',
        price_per_day: 20000,
        location: 'Yaoundé'
      }
    ];
    
    for (const car of cars) {
      await pool.execute(
        'INSERT INTO cars (brand, model, year, seats, transmission, fuel_type, price_per_day, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [car.brand, car.model, car.year, car.seats, car.transmission, car.fuel_type, car.price_per_day, car.location]
      );
    }
    
    res.json({ success: true, message: 'Hôtels et voitures initialisés avec succès' });
  } catch (e) {
    console.error('Erreur lors de l\'initialisation:', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 7. Démarrer le serveur
app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
    console.log(`API d'inscription disponible sur http://localhost:${port}/register (POST)`);
    console.log(`API de connexion disponible sur http://localhost:${port}/login (POST)`);
    console.log(`API de vérification de session disponible sur http://localhost:${port}/profile (GET)`);
    console.log(`API de déconnexion disponible sur http://localhost:${port}/logout (POST)`);
    console.log('Assure-toi que la base de données "sergess" et la table "users" existent.');
    console.log("Exemple d'utilisateur : admin@site.com / adminpass (admin), user@site.com / userpass (user)");
});