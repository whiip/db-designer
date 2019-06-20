module.exports.create = function(services, argv) {
	services.adding.migrationFile(argv.playbook, argv.name)
		.catch(err => {
			console.error(err.message);
		})
		.then(() => {
			console.log('Goodbye!');
		});
};
