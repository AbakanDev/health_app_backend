const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    ssl: {
        ca: fs.readFileSync(path.join(__dirname, 'ca.pem'))
    },
    timezone: '+07:00', 
    dateStrings: true,  
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;