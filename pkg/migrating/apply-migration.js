const async = require('async');

class MigrationFactory {
	constructor(storage) {
		this.storage = storage;
	}
	
	async up(change) {
		return this._upOrDown(change);
	}
	
	async down(change) {
		return this._upOrDown(change);
	}
	
	
	/**
	 * Builds and executes the seed query
	 *
	 * @param change
	 * @returns {Promise<void>}
	 */
	async seed(change) {
		return new Promise((resolve, reject) => {
			const {data, description, sql, columns} = change;
			
			// Show what is about to be done
			console.log(description.trim() + '...');
			console.log(sql);
			
			if (typeof sql === 'undefined') {
				throw Error('No migration script was returned from the file.');
			}
			
			let values = [];
			
			async.eachOfSeries(data, (row, key, next) => {
				// There should be an equal number of keys as there are columns
				if (Object.keys(row).length !== columns.length) {
					console.log('columns', columns);
					console.log('row', row);
					throw Error('Confirm that all fields in this row are listed in the `columns` property');
				}
				
				values = columns.map(column => {
					return row[column];
				});
				
				// Insert the row
				console.log('Inserting:', values);
				this.storage.query(sql, values)
					.then(() => {
						console.log('Done');
						next();
					})
					.catch(err => {
						console.error('pkg.migrating.apply-migration > err.msg', err.message);
						next(err);
					})
			}, (err) => {
				if (err) {
					console.error(err.message);
					reject('One or more errors were encountered while seeding the database');
				}
				
				resolve();
			});
		});
	}
	
	
	/**
	 * Execute one or more SQL commands to apply the changes for this migration
	 *
	 * @param change
	 * @returns {Promise<*>}
	 */
	async _upOrDown(change) {
		return new Promise((resolve, reject) => {
			const { description, sql } = change;
			
			// Show what is about to be done
			console.log(description.trim() + '...');
			console.log(sql);
			
			if (typeof sql === 'undefined') {
				throw Error('No migration script was returned from file.');
			}
			
			this.storage.query(sql)
				.then(() => {
					console.log('Success');
					resolve();
				})
				.catch(err => {
					reject(err);
				})
		});
	}
}


module.exports.MigrationFactory = MigrationFactory;

