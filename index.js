const adding = require('./pkg/adding/adding');
const migrating = require('./pkg/migrating/service');
const cliHandler = require('./pkg/cli/handler');

// Bootstrap
console.log('Whiip DB Migrate');

// Command-line argument delegation
const argv = require('yargs')
	.command('create <playbook> <name>', 'Creates a new migration file', (yargs) => {
		return yargs
			.positional('playbook', {
				describe: 'Specifies which playbook to use',
				type: 'string'
			})
			.positional('name', {
				describe: 'Provide a short descriptive name of the change. This will included as part of the filename.',
				type: 'string'
			});
	}, (argv) => {
		cliHandler.create({
			adding: adding,
			migrating: migrating
		}, argv);
	})
	.command('run <env> <playbook> <migration>', 'Performs a complete teardown and run of the database', (yargs) => {
		return yargs
			.positional('env', {
				describe: 'Specify which environment you wish to process. You can define the environments in the config.yml file',
				type: 'string'
			})
			.positional('playbook', {
				describe: 'Specifies which playbook to use',
				type: 'string'
			})
			.positional('migration', {
				describe: 'Specifies which migration to run',
				type: 'string'
			});
	}, (argv) => {
		// Perform a complete teardown and run of the database
		migrating.run(argv)
			.then(() => {})
			.catch(err => console.error(err.message));
	})
	.demandCommand()
	.help()
	.argv;
