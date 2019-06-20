const async = require('async');
const fs = require('fs');
const yaml = require('js-yaml');
const migrationFactory = require('./apply-migration');
const stores = require('../../storage/storage');

// Global constants
const HR = '-'.repeat(100);


/**
 * Open the config file, and load the settings for the desired environment.
 *
 * @param env
 * @returns {Promise<*>}
 */
async function openConfigForEnv(env) {
	return new Promise((resolve, reject) => {
		try {
			// Load the config file
			const config = yaml.safeLoad(fs.readFileSync('./config.yml', 'utf8'));
			
			// Get the config values for this version
			const configVersion = config.versions.latest;
			
			// Confirm that environment values exist for this config file
			if (typeof configVersion[env] === 'undefined') {
				console.error('No settings exist for this env');
				reject('No settings exist for this environment');
			}
			
			// Return the config settings for this environment
			const myConfig = configVersion[env];
			resolve(myConfig);
			
		} catch (err) {
			console.error(err);
			reject(err);
		}
	});
}


/**
 * Perform a complete teardown and run of the database
 *
 * @param argv
 */
module.exports.run = async function (argv) {
	console.log('About to run the entire database');
	console.log('Environment:', argv.env);
	
	// Set the target directory
	const playbookDirectory = `${__dirname}/../../playbooks/${argv.playbook}`;
	
	// Get the config settings for the requested environment
	const myConfig = await openConfigForEnv(argv.env)
		.then(res => {
			console.log('Environment configuration:', res);
			return res;
		})
		.catch(err => {
			console.error(err.message);
			return null;
		});
	
	// Load the appropriate storage engine...
	const storage = await loadStorage(myConfig.storage)
		.then(res => {
			return res;
		})
		.catch(err => {
			console.error(err.message);
			return null;
		});
	
	const migrationSchedule = await loadMigrationSchedule(playbookDirectory, argv.migration)
		.then(res => {
			return res;
		})
		.catch(err => {
			console.error(err.message);
			return null;
		});
	
	// Perform the migration
	await main(storage, playbookDirectory, migrationSchedule)
		.then((stats) => {
			console.log('Migration complete.', stats);
		})
		.catch(err => {
			console.log('General error');
			console.error(err);
		})
		.finally(() => {
			// Terminate the database connection
			console.log('Terminating database connection...');
			storage.end();
			
			// Do any final garbage collection and terminate application
			console.log('Goodbye!');
		});
};


/**
 * Loads a compiled migration from a playbook
 *
 * @param playbook
 * @param migration
 * @returns {Promise<*>}
 */
async function loadMigrationSchedule(playbookDirectory, migration) {
	return new Promise((resolve, reject) => {
		try {
			// Load the playbook
			const playbookData = yaml.safeLoad(fs.readFileSync(`${playbookDirectory}/playbook.yml`, 'utf8'));
			
			// Load the selected migration
			const migrationSchedule = addScripts(playbookDirectory, playbookData, migration);
			resolve(migrationSchedule);
			
		} catch (err) {
			console.error(err);
			reject(err);
		}
	});
}

function addScripts(playbookDirectory, playbookData, migration) {
	let migrationSchedule = [];
	let referencedMigration = '';
	let script = '';
	playbookData[migration].forEach(n => {
		console.log(n.describe);
		
		// Add any scripts
		if (n.scripts) {
			for (let i = 0; i < n.scripts.length; i++) {
				script = `${playbookDirectory}/scripts/${n.scripts[i]}.js`;
				
				migrationSchedule.push(
					[script, n.actions]
				);
			}
		}
		
		// Add any references to other scripts
		if (n['$ref']) {
			for (let i = 0; i < n['$ref'].length; i++) {
				referencedMigration = n['$ref'][i];
				migrationSchedule = migrationSchedule.concat(addScripts(playbookDirectory, playbookData, referencedMigration))
			}
		}
	});
	
	return migrationSchedule;
}


/**
 * Loads the appropriate storage platform
 *
 * @param storage enum[mysql, postgres]
 */
async function loadStorage(storage) {
	return new Promise((resolve, reject) => {
		switch (storage.name.toLowerCase()) {
			case 'mysql':
				const myStorage = new stores.MySqlStorage(storage);
				resolve(myStorage);
				break;
			// case 'postgres':
			// 	resolve(new stores.PostgresStorage(storage));
			// 	break;
			default:
				reject(`Database '${storage.store}' is not supported at this time.`);
		}
	});
}


/**
 * This will run the migration
 *
 * @returns {Promise<void>}
 */
function main(storage, playbookDirectory, migrationSchedule) {
	return new Promise((resolve, reject) => {
		// Verify that all files exist before attempting to run the migration
		const missingFiles = migrationSchedule.reduce((accumulator, currentValue) => {
			const path = currentValue[0];
			
			// Check if the file exists, if anything unexpected happens, assume the worst
			// and say the file could not be found.
			try {
				if (!fs.existsSync(path)) {
					accumulator.push(path);
				}
			} catch (err) {
				console.error(err.message);
				accumulator.push(path);
			}
			
			return accumulator
		}, []);
		
		if (missingFiles.length > 0) {
			console.log('You are currently missing these files:', missingFiles);
			reject('Missing migration files');
			return;
		}
		
		const applyMigration = new migrationFactory.MigrationFactory(storage);
		
		// Each migration can involve more than one action
		let countOfErrors = 0;
		async.eachOfSeries(migrationSchedule, (change, key, nextChange) => {
			console.log(HR);
			
			// Load the migration
			const filename = change[0];
			const actions = change[1];
			const migrate = require(filename);
			console.log(`${filename}`, actions);
			
			// For each action...
			async.eachOfSeries(actions, (action, actionIndex, nextAction) => {
				// Check if the migration file supports this action
				// (i.e. is there a function by the same name of the action)
				if (typeof migrate[action] !== 'function') {
					throw Error(`The migration file is missing a function called "${action}()"`);
				}
				
				// Load the change
				const change = migrate[action]();
				applyMigration[action](change)
					.then(() => {
						nextAction();
						return true;
					})
					.catch(err => {
						countOfErrors += 1;
						console.error('Error with action:', err.message);
						// nextAction(err);
						// ignore errors
						nextAction();
						return false;
					});
				
			}, (err) => {
				if (err) {
					console.error('Error with change');
					nextChange(err);
					return false;
				}
				
				nextChange(null);
			});
		}, (err) => {
			console.log('Errors:', countOfErrors);
			
			if (err) {
				console.log('Error with series');
				reject(err);
			}
			
			resolve();
		});
	});
}
