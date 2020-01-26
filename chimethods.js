// Set up defaults
const defaultNum=3;
const defaultDuplication=false;
const allowDM=true;

// Returns true if a Queue is active in the given channel
exports.hasQueue = function (msg, table){
	return table[msg.channel]!=undefined;
}

// Creates a QueueTable entry with all fields set to the universal defaults
// and 'owner' set to the message sender
exports.queueBase = function (msg){
	return {queued:[], owner:msg.author, size:defaultNum, dupes:defaultDuplication, 
		open:true, maxplayers:-1};
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
