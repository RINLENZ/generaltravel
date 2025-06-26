// serveur_postgresql.js - Version adaptée pour PostgreSQL

// 1. Charger les variables d'environnement depuis le fichier .env
require('dotenv').config();

// 2. Importer les modules nécessaires
const express = require('express');
const { Pool } = require('pg'); // Utilise pg pour PostgreSQL
const bcrypt = require('bcryptjs');
const cors = require('cors'); // Pour gérer les requêtes inter-origines
const session = require('express-session');
const { initDatabase } = require('./init-database');

// 3. Initialiser l'application Express
const app = express();
const port = process.env.PORT || 3000; // Le port sur lequel votre serveur va écouter

// 4. Configurer les middlewares
app.use(express.json()); // Permet à Express de lire les corps de requêtes JSON
app.use(cors({
    origin: [
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'https://generaltravel-1.onrender.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(session({
    secret: process.env.SESSION_SECRET || 'votre_secret_ultra_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Gérer les requêtes préflight OPTIONS pour toutes les routes
app.options('*', cors());

// 5. Configurer le pool de connexion PostgreSQL
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 6. Initialiser la base de données au démarrage
async function startServer() {
    try {
        console.log('🚀 Démarrage du serveur...');
        
        // Initialiser la base de données
        await initDatabase();
        
        // Démarrer le serveur Express
        app.listen(port, () => {
            console.log(`✅ Serveur démarré sur le port ${port}`);
            console.log(`📊 Mode: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🗄️ Base de données: ${process.env.DB_HOST || 'localhost'}`);
        });
        
    } catch (error) {
        console.error('❌ Erreur lors du démarrage:', error);
        process.exit(1);
    }
}

// 7. Définir les points d'accès (routes) de l'API

// --- Point d'accès pour l'inscription (Register) ---
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    // Validation basique des entrées
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }

    try {
        // Vérifier si l'utilisateur existe déjà (par nom d'utilisateur ou email)
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ message: 'Ce nom d\'utilisateur ou cet e-mail existe déjà.' });
        }

        // Hacher le mot de passe avant de le stocker
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insérer le nouvel utilisateur dans la base de données
        await pool.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3)',
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
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Identifiants invalides' });
        }
        const user = result.rows[0];
        
        // Pour la compatibilité, on accepte aussi les mots de passe non hachés
        let valid = false;
        if (user.password === password) {
            valid = true;
        } else {
            valid = await bcrypt.compare(password, user.password);
        }
        
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
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    // Supprimer d'abord les réservations de l'utilisateur
    await pool.query('DELETE FROM reservations WHERE user_id = $1', [req.params.id]);
    
    // Puis supprimer l'utilisateur
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
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
    await pool.query('DELETE FROM reservations WHERE id = $1', [req.params.id]);
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
    await pool.query(
      'INSERT INTO reservations (user_id, type, destination, date, statut, prix) VALUES ($1, $2, $3, $4, $5, $6)',
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
    let query = 'UPDATE reservations SET type=$1, destination=$2, date=$3, statut=$4, prix=$5 WHERE id=$6';
    let params = [type, destination, date, statut, prix, req.params.id];
    if (req.session.user.role !== 'admin') {
      query += ' AND user_id=$7';
      params.push(req.session.user.id);
    }
    const result = await pool.query(query, params);
    if (result.rowCount === 0) return res.status(403).json({ error: 'Non autorisé' });
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
    let query = 'SELECT * FROM trips WHERE 1=1';
    let params = [];
    let paramIndex = 1;
    
    if (departure) {
      query += ` AND departure ILIKE $${paramIndex}`;
      params.push(`%${departure}%`);
      paramIndex++;
    }
    
    if (destination) {
      query += ` AND destination ILIKE $${paramIndex}`;
      params.push(`%${destination}%`);
      paramIndex++;
    }
    
    query += ' ORDER BY departure_time';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la recherche de trajets:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les sièges occupés pour un trajet
app.get('/api/trips/:id/seats', async (req, res) => {
  const { id } = req.params;
  const { date } = req.query;
  
  try {
    const result = await pool.query(
      'SELECT seats FROM bus_bookings WHERE trip_id = $1 AND date = $2',
      [id, date]
    );
    
    const occupiedSeats = [];
    result.rows.forEach(row => {
      if (row.seats && Array.isArray(row.seats)) {
        occupiedSeats.push(...row.seats);
      }
    });
    
    res.json(occupiedSeats);
  } catch (error) {
    console.error('Erreur lors de la récupération des sièges:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer une réservation de bus
app.post('/api/bookings', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Non autorisé' });
  
  const { tripId, date, seats, firstName, lastName, email, phone, comments } = req.body;
  
  try {
    // Générer une référence de réservation unique
    const bookingRef = 'BUS' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
    
    await pool.query(
      'INSERT INTO bus_bookings (trip_id, user_id, date, seats, first_name, last_name, email, phone, comments, booking_ref) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      [tripId, req.session.user.id, date, seats, firstName, lastName, email, phone, comments, bookingRef]
    );
    
    res.json({ success: true, bookingRef });
  } catch (error) {
    console.error('Erreur lors de la création de la réservation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// === API utilisateur ===

// Récupérer les réservations d'un utilisateur
app.get('/api/user/reservations', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Non autorisé' });
  
  try {
    const result = await pool.query(
      'SELECT * FROM reservations WHERE user_id = $1 ORDER BY created_at DESC',
      [req.session.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des réservations:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer une réservation utilisateur
app.delete('/api/user/reservations/:id', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Non autorisé' });
  
  try {
    const result = await pool.query(
      'DELETE FROM reservations WHERE id = $1 AND user_id = $2',
      [req.params.id, req.session.user.id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Réservation non trouvée' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Statistiques utilisateur
app.get('/api/user/stats', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Non autorisé' });
  
  try {
    // Statistiques de base
    const reservationsResult = await pool.query(
      'SELECT COUNT(*) as total, SUM(prix) as total_spent FROM reservations WHERE user_id = $1',
      [req.session.user.id]
    );
    
    const destinationsResult = await pool.query(
      'SELECT COUNT(DISTINCT destination) as destinations FROM reservations WHERE user_id = $1',
      [req.session.user.id]
    );
    
    // Réservations récentes (ce mois)
    const recentResult = await pool.query(
      'SELECT COUNT(*) as recent FROM reservations WHERE user_id = $1 AND created_at >= DATE_TRUNC(\'month\', CURRENT_DATE)',
      [req.session.user.id]
    );
    
    // Première et dernière réservation
    const datesResult = await pool.query(
      'SELECT MIN(created_at) as first, MAX(created_at) as last FROM reservations WHERE user_id = $1',
      [req.session.user.id]
    );
    
    // Destinations favorites
    const favoritesResult = await pool.query(
      'SELECT destination, COUNT(*) as count FROM reservations WHERE user_id = $1 GROUP BY destination ORDER BY count DESC LIMIT 5',
      [req.session.user.id]
    );
    
    // Statistiques par type
    const typeResult = await pool.query(
      'SELECT type, COUNT(*) as count FROM reservations WHERE user_id = $1 GROUP BY type',
      [req.session.user.id]
    );
    
    const stats = {
      totalReservations: parseInt(reservationsResult.rows[0]?.total || 0),
      totalSpent: parseFloat(reservationsResult.rows[0]?.total_spent || 0),
      destinationsVisited: parseInt(destinationsResult.rows[0]?.destinations || 0),
      recentReservations: parseInt(recentResult.rows[0]?.recent || 0),
      points: Math.floor(parseFloat(reservationsResult.rows[0]?.total_spent || 0) / 1000), // 1 point par 1000 FCFA
      conversionRate: 10, // 10% de conversion
      firstReservation: datesResult.rows[0]?.first,
      lastReservation: datesResult.rows[0]?.last,
      favoriteDestinations: favoritesResult.rows,
      typeStats: typeResult.rows,
      monthlyStats: [] // À implémenter si nécessaire
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// === API admin ===

// Récupérer tous les utilisateurs (admin)
app.get('/api/admin/users', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.status(401).json({ error: 'Non autorisé' });
  
  try {
    const result = await pool.query('SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer toutes les réservations (admin)
app.get('/api/admin/reservations', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.status(401).json({ error: 'Non autorisé' });
  
  try {
    const result = await pool.query(`
      SELECT r.*, u.username, u.email 
      FROM reservations r 
      JOIN users u ON r.user_id = u.id 
      ORDER BY r.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des réservations:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// === API hôtels ===

// Recherche d'hôtels
app.get('/api/hotels', async (req, res) => {
  const { city, checkIn, checkOut, guests } = req.query;
  
  try {
    let query = 'SELECT * FROM hotels WHERE 1=1';
    let params = [];
    let paramIndex = 1;
    
    if (city) {
      query += ` AND city ILIKE $${paramIndex}`;
      params.push(`%${city}%`);
      paramIndex++;
    }
    
    if (guests) {
      query += ` AND capacity >= $${paramIndex}`;
      params.push(parseInt(guests));
      paramIndex++;
    }
    
    query += ' ORDER BY rating DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la recherche d\'hôtels:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les chambres d'un hôtel
app.get('/api/hotels/:id/rooms', async (req, res) => {
  const { id } = req.params;
  const { checkIn, checkOut, guests } = req.query;
  
  try {
    let query = 'SELECT * FROM rooms WHERE hotel_id = $1';
    let params = [id];
    let paramIndex = 2;
    
    if (guests) {
      query += ` AND capacity >= $${paramIndex}`;
      params.push(parseInt(guests));
      paramIndex++;
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des chambres:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Réservation d'hôtel
app.post('/api/hotel-bookings', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Non autorisé' });
  
  const { hotelId, roomId, checkIn, checkOut, guests, guestName, guestEmail, guestPhone } = req.body;
  
  try {
    const bookingRef = 'HOTEL' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
    
    await pool.query(
      'INSERT INTO hotel_bookings (hotel_id, room_id, user_id, check_in, check_out, guests, guest_name, guest_email, guest_phone, booking_ref) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      [hotelId, roomId, req.session.user.id, checkIn, checkOut, guests, guestName, guestEmail, guestPhone, bookingRef]
    );
    
    res.json({ success: true, bookingRef });
  } catch (error) {
    console.error('Erreur lors de la réservation d\'hôtel:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// === API voitures ===

// Recherche de voitures
app.get('/api/cars', async (req, res) => {
  const { city, pickupDate, returnDate, passengers } = req.query;
  
  try {
    let query = 'SELECT * FROM cars WHERE 1=1';
    let params = [];
    let paramIndex = 1;
    
    if (city) {
      query += ` AND location ILIKE $${paramIndex}`;
      params.push(`%${city}%`);
      paramIndex++;
    }
    
    if (passengers) {
      query += ` AND seats >= $${paramIndex}`;
      params.push(parseInt(passengers));
      paramIndex++;
    }
    
    query += ' ORDER BY price_per_day ASC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la recherche de voitures:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Réservation de voiture
app.post('/api/car-bookings', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Non autorisé' });
  
  const { carId, pickupDate, returnDate, pickupLocation, returnLocation, driverName, driverLicense, driverPhone } = req.body;
  
  try {
    const bookingRef = 'CAR' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
    
    await pool.query(
      'INSERT INTO car_bookings (car_id, user_id, pickup_date, return_date, pickup_location, return_location, driver_name, driver_license, driver_phone, booking_ref) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      [carId, req.session.user.id, pickupDate, returnDate, pickupLocation, returnLocation, driverName, driverLicense, driverPhone, bookingRef]
    );
    
    res.json({ success: true, bookingRef });
  } catch (error) {
    console.error('Erreur lors de la réservation de voiture:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 8. Démarrer le serveur
startServer(); 