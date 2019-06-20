const mysql = require('mysql');

class MySQLStorage {
	constructor(connectionParameters) {
		console.log('Connecting to MySQL...');
		
		this.connection = mysql.createConnection({
			host: connectionParameters.host,
			user: connectionParameters.user,
			password: connectionParameters.password,
			database: connectionParameters.database,
			multipleStatements: true
		});
		
		this.connection.connect();
	}
	
	/**
	 * Generalized method for executing a query
	 *
	 * @param sql
	 * @param values
	 * @returns {Promise<*>}
	 */
	async query(sql, values) {
		return new Promise((resolve, reject) => {
			this.connection.query(sql, values, (error, results, fields) => {
				if (error) {
					reject(error);
					return;
				}
				
				resolve(results);
			});
		})
	}
	
	
	/**
	 * Generalized method for closing the connection
	 */
	end() {
		this.connection.end();
	}
}

module.exports = MySQLStorage;