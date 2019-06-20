const fs = require('fs');

/**
 * Creates a timestamped migration file to the working migration directory
 */
module.exports = function(playbook, name) {
	return new Promise((resolve, reject) => {
		// Set the target directory
		const playbookDirectory = `${__dirname}/../../playbooks/${playbook}`;
		
		// Verify that the playbook directory exists
		if (!fs.existsSync(playbookDirectory)) {
			reject(new Error(`The playbook you specified does not exist. \nEnsure the playbook exists at "${playbookDirectory}", and try again.`));
			return false;
		}
		
		// Build the dynamic filename
		const filename = makeFilename(name);
		
		// Copy the template migration file
		fs.copyFile('./templates/migration.js', `${playbookDirectory}/scripts/${filename}`, (err) => {
			if (err) throw err;
			console.log(`A file named "${filename}" has been created at "${playbookDirectory}".`);
			resolve(filename);
		});
	});
};


/**
 * Makes a dynamic filename which combines a date/time stamp + the name of the
 * migration file.
 *
 * @param name
 * @returns {string}
 */
function makeFilename(name) {
	// Replace all spaces in the name with dashes
	const description = name.replace(/ /g, '-');
	
	// Build the date string
	const d = new Date();
	const year = d.getFullYear();
	const month = ('0' + (d.getMonth() + 1)).slice(-2);
	const day = ('0' + d.getDate()).slice(-2);
	const hh = d.getHours();
	const mm = d.getMinutes();
	const hhmm = (`0${hh}`).slice(-2) + (`0${mm}`).slice(-2);
	
	// Build the filename
	return `${year}-${month}-${day}-${hhmm}-${description}.js`;
}
