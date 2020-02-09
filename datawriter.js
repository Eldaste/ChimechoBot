// Settings
const useDB=false;

// Set up 
if(useDB){
	var { Client } = require('pg');
	
	var dbconnect = new Client({
		connectionString: process.env.DATABASE_URL,
		ssl: true,
	});
	
	dbconnect.connect();
	
	dbconnect.query('CREATE TABLE IF NOT EXISTS preferences (id bigint PRIMARY KEY, datum json);', (err, res) => {});
	dbconnect.query('CREATE TABLE IF NOT EXISTS temp (idt bigint PRIMARY KEY, datumt json);', (err, res) => {});
}
else
	var fs = require('fs');

// Save a User's settings if able
// Returns true if able, false otherwise
exports.saveUserPref = async function (user, settings){
	
	if(useDB){
		// Create values table
		let vals=[user.id];
		let text='DELETE FROM preferences WHERE preferences.id = $1;';

		await dbconnect.query(text, vals).then(data=>{}).catch(err=>{});

		vals=[user.id, JSON.stringify(settings)];
		text='INSERT INTO preferences (id, datum) VALUES ($1, $2);';
		
		return await dbconnect.query(text, vals).then(data=>{return true;}).catch(err=>{return false;});
	}
	else{
		let path = "./User_Preferences/"+user.id+".json";

		return await fs.promises.writeFile(path, JSON.stringify(settings)).then(_=>{return true;}).catch(err=>{return false;});
	}
}

// Saves a table of active Queues
exports.saveTableData = async function (data){
	//Data is in the form of a JSON object with the channel IDs as the keys
	
	if(useDB){
		
		// Clear the temp table
		let text='DELETE FROM temp;'
		let vals=[];
		
		await dbconnect.query(text).catch(err=>{throw err});
		
		// Dissassemble Queues into indivital channels, then save each the created temp table
		text = 'INSERT INTO temp (idt, datumt) VALUES ($1, $2);';
		
		for(let x in data){
			vals=[x, JSON.stringify(data[x])];
			
			await dbconnect.query(text, vals).catch(err=>{});
		}
	}
	else{
		return await fs.promises.writeFile('temp.json', JSON.stringify(data)).then(_=>{return true;}).catch(err=>{throw err;});
	}
}	

// Loads the previously saved Queue data
exports.loadTableData = async function (){
	//Data is in the form of a JSON object with the channel IDs as the keys
	
	if(useDB){
		let result={};
		
		let text='SELECT idt, datumt FROM temp;';

		await dbconnect.query(text).then(data=>{
			if(data.rows.length==0)
				return;

			for(let y=0;y<data.rows.length;y++)
				result[data.rows[y].idt]=data.rows[y].datumt;
			
		}).catch(err => {throw err});
		
		return result;
	}
	else{
		return await fs.promises.readFile('temp.json', 'utf8').then(data=>{return JSON.parse(data);}).catch(err=>{return {};});
	}
}	

// Retrieve a User's settings if able
exports.readUserPref = async function (user){
	
	let result = {};
	
	if(useDB){
		// Handle DB
		let vals=[user.id];
		let text='SELECT id, datum FROM preferences WHERE preferences.id = $1;';

		await dbconnect.query(text, vals).then(data=>{
			if(data.rows.length==0)
				return;

			let tmp=data.rows[0].datum;
			result=tmp;
		}).catch(err=>{});
	}
	else{	
		let path = "./User_Preferences/"+user.id+".json";

		await fs.promises.readFile(path, 'utf8').then(data=>{result=JSON.parse(data);}).catch(err=>{});
	}
	
	return result;
}