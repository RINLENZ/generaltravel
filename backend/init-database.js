// Script d'initialisation automatique de la base de données
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDatabase() {
    try {
        console.log('🔗 Connexion à la base de données...');
        
        // Lire le fichier SQL
        const sqlPath = path.join(__dirname, 'database_postgresql.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('📝 Exécution du script SQL...');
        
        // Découper le script en commandes individuelles (en gardant l'ordre)
        const commands = sqlContent
            .split(';')
            .map(cmd => cmd.trim())
            .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
        
        for (const command of commands) {
            if (command.trim()) {
                try {
                    await pool.query(command);
                    console.log('✅ Commande exécutée:', command.substring(0, 50) + '...');
                } catch (error) {
                    // Ignorer les erreurs de contrainte ou de table déjà existante
                    if (
                        !error.message.includes('duplicate key') &&
                        !error.message.includes('already exists') &&
                        !error.message.includes('relation') &&
                        !error.message.includes('duplicate')
                    ) {
                        console.error('❌ Erreur:', error.message);
                    }
                }
            }
        }
        
        console.log('🎉 Base de données initialisée avec succès !');
        
        // Vérifier les données (uniquement si la table users existe)
        try {
            const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
            const tripsResult = await pool.query('SELECT COUNT(*) as count FROM trips');
            const hotelsResult = await pool.query('SELECT COUNT(*) as count FROM hotels');
            const carsResult = await pool.query('SELECT COUNT(*) as count FROM cars');
            
            console.log('📊 Statistiques :');
            console.log(`   - Utilisateurs: ${usersResult.rows[0].count}`);
            console.log(`   - Trajets: ${tripsResult.rows[0].count}`);
            console.log(`   - Hôtels: ${hotelsResult.rows[0].count}`);
            console.log(`   - Voitures: ${carsResult.rows[0].count}`);
        } catch (e) {
            console.log('ℹ️ Les tables ne sont pas encore toutes créées.');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter si le script est appelé directement
if (require.main === module) {
    initDatabase();
}

module.exports = { initDatabase }; 