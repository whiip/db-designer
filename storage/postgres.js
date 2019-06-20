const { Pool } = require('pg/lib');

class PostgresStorage {
	constructor(connectionParameters) {
		console.log('Connecting to database...');
		this.pool = new Pool(connectionParameters);
	}
	
	async query(sql, values) {
		return new Promise(resolve => {
			this.pool.query(sql, values)
				.then(() => {
					console.log('Done');
					resolve();
				})
				.catch(err => {
					console.log('Error');
					console.error('err.msg', err.message);
					console.error('err.stack', err.stack);
					resolve(err);
				});
		});
	}
	
	end() {
		this.pool.end();
	}
}

module.exports.PostgresStorage = PostgresStorage;
