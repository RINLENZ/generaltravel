-- Script de création de la base de données General Travel
-- À exécuter sur votre base de données MySQL/PostgreSQL

-- Créer la base de données
CREATE DATABASE IF NOT EXISTS general_travel;
USE general_travel;

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des réservations
CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    statut ENUM('Confirmée', 'Annulée', 'Terminée') DEFAULT 'Confirmée',
    prix DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des trajets
CREATE TABLE IF NOT EXISTS trips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    departure VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    departure_time TIME NOT NULL,
    arrival_time TIME NOT NULL,
    duration VARCHAR(20) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    company VARCHAR(100) NOT NULL,
    features JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des réservations de bus
CREATE TABLE IF NOT EXISTS bus_bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trip_id INT NOT NULL,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    seats JSON NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    comments TEXT,
    booking_ref VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES trips(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table des hôtels
CREATE TABLE IF NOT EXISTS hotels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    rating DECIMAL(2,1) DEFAULT 0,
    capacity INT DEFAULT 2,
    price_per_night DECIMAL(10,2) NOT NULL,
    amenities TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des chambres
CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hotel_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    capacity INT NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL,
    floor INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id)
);

-- Table des réservations d'hôtel
CREATE TABLE IF NOT EXISTS hotel_bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hotel_id INT NOT NULL,
    room_id INT NOT NULL,
    user_id INT NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    guests INT NOT NULL,
    guest_name VARCHAR(100) NOT NULL,
    guest_email VARCHAR(100) NOT NULL,
    guest_phone VARCHAR(20) NOT NULL,
    booking_ref VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table des voitures
CREATE TABLE IF NOT EXISTS cars (
    id INT AUTO_INCREMENT PRIMARY KEY,
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    seats INT NOT NULL,
    transmission VARCHAR(20) NOT NULL,
    fuel_type VARCHAR(20) NOT NULL,
    location VARCHAR(100) NOT NULL,
    price_per_day DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des réservations de voiture
CREATE TABLE IF NOT EXISTS car_bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    car_id INT NOT NULL,
    user_id INT NOT NULL,
    pickup_date DATE NOT NULL,
    return_date DATE NOT NULL,
    pickup_location VARCHAR(100) NOT NULL,
    return_location VARCHAR(100) NOT NULL,
    driver_name VARCHAR(100) NOT NULL,
    driver_license VARCHAR(50) NOT NULL,
    driver_phone VARCHAR(20) NOT NULL,
    booking_ref VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (car_id) REFERENCES cars(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insérer des données d'exemple

-- Utilisateur admin par défaut (mot de passe: admin123)
INSERT INTO users (username, email, password, role) VALUES 
('admin', 'admin@generaltravel.com', 'admin123', 'admin');

-- Trajets d'exemple
INSERT INTO trips (departure, destination, departure_time, arrival_time, duration, price, company, features) VALUES
('Douala', 'Yaoundé', '08:00:00', '12:00:00', '4h', 5000, 'Express Voyages', '["WiFi", "Climatisation", "WC"]'),
('Yaoundé', 'Douala', '14:00:00', '18:00:00', '4h', 5000, 'Express Voyages', '["WiFi", "Climatisation"]'),
('Douala', 'Bafoussam', '07:30:00', '11:30:00', '4h', 4500, 'Cameroon Express', '["WiFi", "Climatisation", "WC", "Snacks"]'),
('Bafoussam', 'Douala', '13:30:00', '17:30:00', '4h', 4500, 'Cameroon Express', '["WiFi", "Climatisation"]'),
('Douala', 'Kribi', '06:00:00', '09:00:00', '3h', 3500, 'Coastal Express', '["WiFi", "Climatisation"]'),
('Yaoundé', 'Bafoussam', '09:00:00', '13:00:00', '4h', 4800, 'Highland Tours', '["WiFi", "Climatisation", "WC"]');

-- Hôtels d'exemple
INSERT INTO hotels (name, city, rating, capacity, price_per_night, amenities) VALUES
('Hôtel du Plateau', 'Douala', 4.5, 4, 25000, 'WiFi, Piscine, Restaurant, Parking'),
('Residence Yaoundé', 'Yaoundé', 4.2, 3, 22000, 'WiFi, Restaurant, Salle de sport'),
('Hotel Central', 'Bafoussam', 3.8, 2, 18000, 'WiFi, Restaurant'),
('Beach Resort Kribi', 'Kribi', 4.7, 6, 35000, 'WiFi, Piscine, Restaurant, Plage privée'),
('Business Hotel', 'Douala', 4.0, 2, 20000, 'WiFi, Restaurant, Salle de conférence');

-- Chambres d'exemple
INSERT INTO rooms (hotel_id, type, capacity, price_per_night, floor) VALUES
(1, 'Chambre Standard', 2, 25000, 1),
(1, 'Suite Deluxe', 4, 45000, 2),
(2, 'Chambre Standard', 2, 22000, 1),
(2, 'Chambre Familiale', 3, 32000, 2),
(3, 'Chambre Standard', 2, 18000, 1),
(4, 'Chambre Vue Mer', 2, 35000, 1),
(4, 'Suite Familiale', 6, 55000, 2),
(5, 'Chambre Business', 2, 20000, 1);

-- Voitures d'exemple
INSERT INTO cars (brand, model, year, seats, transmission, fuel_type, location, price_per_day) VALUES
('Toyota', 'Corolla', 2020, 5, 'Manuelle', 'Essence', 'Douala', 15000),
('Honda', 'CR-V', 2019, 7, 'Automatique', 'Essence', 'Yaoundé', 25000),
('Nissan', 'Micra', 2021, 5, 'Manuelle', 'Essence', 'Bafoussam', 12000),
('Toyota', 'Hilux', 2018, 5, 'Manuelle', 'Diesel', 'Douala', 30000),
('Hyundai', 'Tucson', 2022, 5, 'Automatique', 'Essence', 'Yaoundé', 22000),
('Suzuki', 'Swift', 2021, 5, 'Manuelle', 'Essence', 'Kribi', 10000);

-- Réservations d'exemple
INSERT INTO reservations (user_id, type, destination, date, statut, prix) VALUES
(1, 'Bus', 'Yaoundé', '2024-07-15', 'Confirmée', 5000),
(1, 'Hôtel', 'Douala', '2024-07-20', 'Confirmée', 25000),
(1, 'Voiture', 'Bafoussam', '2024-08-01', 'Confirmée', 30000); 