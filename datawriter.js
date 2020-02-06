// Settings
const useDB=false;

// Set up 
if(useDB)
	var dbconnect = '';
else
	var fs = require('fs');

// Save a User's settings if able
// Returns true if able, false otherwise
exports.saveUserPref = function (user, settings){
	
	if(useDB){
		// Handle DB
	}
	else{
		let path = "./User_Preferences/"+user.id+".json";

		fs.writeFile (path, JSON.stringify(settings), function(err) {if(err) return false;});
	
		return true;
	}
}

// Retrieve a User's settings if able
exports.readUserPref = function (user){
	
	let result = {};
	
	if(useDB){
		// Handle DB
	}
	else{	
		let path = "./User_Preferences/"+user.id+".json";

		try{
			let data=fs.readFileSync(path);
			result = JSON.parse(data); 

		} catch(err){} // Catches the error of the file not existing
	}

	return result;
}