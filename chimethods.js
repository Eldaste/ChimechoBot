// Set up defaults
const defaultNum=3;
const defaultDuplication=false;
const allowDM=true;
const defaultMaxPlayers=-1;

// Returns true if a Queue is active in the given channel
exports.hasQueue = function (msg, table){
	return table[msg.channel]!=undefined;
}

// Creates a QueueTable entry with all fields set to the universal defaults
// and 'owner' set to the message sender
exports.queueBase = function (msg){
	return {queued:[], owner:msg.author, size:defaultNum, dupes:defaultDuplication, 
		open:true, maxplayers:defaultMaxPlayers};
}

// Takes a QueueTable entry and creates a SettingsDictionary for it
exports.getSettings = function (queue){

	let base = {};

	if(queue.size != defaultNum)
		base.size=queue.size;

	if(queue.dupes != defaultDuplication)
		base.dupes=queue.dupes;
	
	if(queue.maxplayers != defaultMaxPlayers)
		base.maxplayers=queue.maxplayers;

	return base;
}

// Takes a SettingsDictonay entry and applies it to a QueueTable entry
// Returns what settings were updated
exports.setSettings = function (queue, settings){

	let base = {};

	if(settings.size!=undefined && queue.size != settings.size){
		base.size=settings.size;
		queue.size=settings.size;
	}

	if(settings.dupes!=undefined && queue.dupes != settings.dupes){
		base.dupes=settings.dupes;
		queue.dupes=settings.dupes;
	}

	if(settings.maxplayers!=undefined && queue.maxplayers != settings.maxplayers){
		base.maxplayers=settings.maxplayers;
		queue.maxplayers=settings.maxplayers;
	}

	return base;
}

// Save a User's settings if able
// Returns true if able, false otherwise
exports.saveSettings = function (user, settings, fs){
	
	let path = "./User_Preferences/"+user.id+".json";

	fs.writeFile (path, JSON.stringify(settings), function(err) {if(err) return false;});
	
	return true;
}

// Retrieve a User's settings if able
exports.readSettings = function (user, fs){
	
	let result = {};
	
	let path = "./User_Preferences/"+user.id+".json";

	try{
		let data=fs.readFileSync(path);
		result = JSON.parse(data); 

	} catch(err){} // Catches the error of the file not existing

	return result;
}

// Returns true iff the user is the owner of a given channel's Queue
exports.isOwner = function (msg, table){
	return table[msg.channel].owner==msg.author;
}

// Returns true iff the user is a mod of a given channel
exports.isMod = function (msg, modNames){

	let roleList = msg.guild.roles.array();
		
	for(let x in roleList)
		if(modNames.indexOf(roleList[x].name)!=-1)
			if (msg.member.roles.has(roleList[x].id))
				return true;

	return false;
}

// Clears the Queue if the Queue is empty and messages the owner/channel that the Queue no longer exists.
// Returns true if the channel was cleared.
exports.clearIfEmpty = function (msg, table, chn){

	if(0 == table[chn].queued.length){
		msg.author.send("Queue cleared.");
		chn.send("Queue cleared.");
		table[chn]=undefined;

		return true;
	}
	
	return false;
}

// Returns true if the message author is in the Queue
exports.isEnqueued = function (msg, table){

	for(let x of table[msg.channel].queued)
		if(x==msg.author)
			return true;

	return false;
}

// Finds the first instance of the author if the message in the Queue. Returns -1 if not found
exports.findUser = function (msg, table){
	
	for(let x=0; x<table[msg.channel].queued.length;x++)
		if(table[msg.channel].queued[x]==msg.author)
			return x;	

	return -1;
}

// Returns a string containing a random number from 0000 to 9999
exports.randomCode = function (){
	
	let coderaw=Math.floor(Math.random() * 10000);
	

	let code=""+coderaw;

	if(coderaw<1) code="0"+code;
	if(coderaw<10) code="0"+code;
	if(coderaw<100) code="0"+code;
	if(coderaw<1000) code="0"+code;

	return code;
}

// Returns true if the Queue is in restricted mode and all spots are accounted for.
exports.isFilled = function (msg, table){
	
	if(table[msg.channel].maxplayers == -1)
		return false;

	return table[msg.channel].queued.length >= table[msg.channel].maxplayers;

} 

// Creates a DMTable entry with all fields set to the provided values
exports.dmBase = function (chn, code){
	return {queue:chn, allowed:allowDM, lastcode: code};
}

// Create a group and send messages with a random code to each member of that group.
exports.createGroup = function (msg, table, dmtable, fromdm){

	let chn;

	// Should not reach this state, but better safe than sorry
	if(fromdm && dmtable[msg.author] == undefined)
		return;

	// Set the queue to look at
	if(fromdm){
		// Peform a check that the use owns the Queue. Not needed for non-DM.
		// This is also how the dmtable clears itself other than .close
		if (table[dmtable[msg.author].queue] == undefined || msg.author != table[dmtable[msg.author].queue].owner){
			msg.reply("Unable to make another group. Try again from the Queue thread.");
			dmtable[msg.author]=undefined;
			return;
		}

		chn=dmtable[msg.author].queue;
	}
	else{
		chn=msg.channel;
	}

	// Make sure there's someone to join
	if(table[chn].queued.length==0){
		msg.reply("Queue is empty.");
		return;
	}

	let total=0;
	let code=this.randomCode();

	for(var i=0;i<table[chn].size;i++){
		// Get a user 
		let user=table[chn].queued.shift();

		user.send("Your join code is "+code+". The lobby is up now. If you miss your chance, you'll need to join the queue again.").catch(err => msg.channel.send('Unable to alert a player of the code.'));

		total++;

		// If no users remain in the Queue, force a loop break
		if(table[chn].queued.length==0){
			i=table[chn].size;
		}
	}

	// Alert Queue owner to the code and how many to expect
	if(total == 1) msg.author.send("The code is "+code+". "+total+" user is joining.");
	else msg.author.send("The code is "+code+". "+total+" users are joining.");

	// Set up DMTable entry if needed. Otherwise update with new code.
	if(fromdm)
		dmtable[msg.author].lastcode=code;
	else
		dmtable[msg.author]=this.dmBase(chn, code);

	// If there is a max player limit, modify it to account for a lobby passing.
	if(table[chn].maxplayers != -1){
		table[chn].maxplayers=table[chn].maxplayers-table[chn].size;
			
		if(table[chn].maxplayers<0)
			table[chn].maxplayers=0; 
	}

	if(!table[chn].open || table[chn].maxplayers == 0)
		if(this.clearIfEmpty(msg, table, chn))
			dmtable[msg.author] = undefined;
}

// Add another member of the queue to the current group. Only usable after a next.
exports.addMember = function (msg, table, dmtable, fromdm){

	let chn;

	// Make sure there's a group
	if(dmtable[msg.author] == undefined){
		msg.reply("No active group. Use .next to form a group.");
		return;
	}

	// Set the queue to look at
	if(fromdm){
		// Peform a check that the use owns the Queue. Not needed for non-DM.
		// This is also how the dmtable clears itself other than .close
		if (table[dmtable[msg.author].queue] == undefined || msg.author != table[dmtable[msg.author].queue].owner){
			msg.reply("Unable to add a member. Try again from the Queue thread.");
			dmtable[msg.author]=undefined;
			return;
		}

		chn=dmtable[msg.author].queue;
	}
	else{
		chn=msg.channel;
	}

	// Make sure there's someone to join
	if(table[chn].queued.length==0){
		msg.reply("Queue is empty.");
		return;
	}

	let code=dmtable[msg.author].lastcode;

	// Get a user 
	let user=table[chn].queued.shift();

	user.send("Your join code is "+code+". The lobby is up now. If you miss your chance, you'll need to join the queue again.").catch(err => msg.channel.send('Unable to alert a player of the code.'));

	msg.author.send("The next in queue has been sent a code.");

	if(!table[chn].open || table[chn].maxplayers == 0)
		if(this.clearIfEmpty(msg, table, chn))
			dmtable[msg.author] = undefined;
}
