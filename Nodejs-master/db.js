const mysql = require('mysql');
const db = mysql.createConnection({
	host : 'localhost',
	user : 'root',
	password : '1234fdsaFDSA$#@!',
	database : 'my_db'
});
db.connect();

module.exports = db;
