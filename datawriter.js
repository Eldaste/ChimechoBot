// Settings
const useDB=true;

// Set up 
if(useDB){
	var { Client } = require('pg');
	
	var dbconnect = new Client({
		connectionString: process.env.DATABASE_URL,
		ssl: true,
	});
	
	dbconnect.connect();
	
	dbconnect.query('CREATE TABLE IF NOT EXISTS preferences (id bigint PRIMARY KEY, datum json);', (err, res) => {});
}
else
	var fs = require('fs');

// Save a User's settings if able
// Returns true if able, false otherwise
exports.saveUserPref = async function (user, settings){
	
	if(useDB){
		// Create values table
		let vals=[user.id, JSON.stringify(settings)];
		let text='DELETE FROM preferences WHERE preferences.id = $1;';
		
		await dbconnect.query(text, vals).then(data=>{}).catch(err=>{});
		
		text='INSERT INTO preferences (id, datum) VALUES ($1, $2);';
		
		return await dbconnect.query(text, vals).then(data=>{return true;}).catch(err=>{return err;});
	}
	else{
		let path = "./User_Preferences/"+user.id+".json";

		return await fs.promises.writeFile(path, JSON.stringify(settings)).then(_=>{return true;}).catch(err=>{return false;});
	}
}

// Retrieve a User's settings if able
exports.readUserPref = async function (user){
	
	let result = {"banlist":["675051020996444242"]};
	
	if(useDB){
		// Handle DB
		let vals=[user.id];
		let text='SELECT id, datum FROM preferences WHERE preferences.id = $1;';
		
		await dbconnect.query(text, vals).then(data=>{
			if(data.length==0)
				return;
			
			let tmp=data[1].datum;
			result=JSON.parse(tmp);
		}).catch(err=>{});
	}
	else{	
		let path = "./User_Preferences/"+user.id+".json";

		await fs.promises.readFile(path, 'utf8').then(data=>{result=JSON.parse(data);}).catch(err=>{});
	}
	
	return result;
}