// Set up defaults
const defaultNum=3;
const defaultDuplication=false;

// Returns true if a Queue is active in the given channel
exports.hasQueue = function (msg, table){
	return table[msg.channel]!=undefined;
}

// Creates a QueueTable entry with all fields set to the universal defaults
// and 'owner' set to the message sender
exports.queueBase = function (msg){
	return {queued:[], owner:msg.author, size:defaultNum, dupes:defaultDuplication, open:true};
}

// Returns true iff the user is the owner of a given channel's Queue
exports.isOwner = function (msg, table){
	return table[msg.channel].owner==msg.author;
}

// Returns true iff the user is a mod of a given channel
exports.isMod = function (msg, modNames){

	let roleList = msg.guild.roles.array();
		
	for(x in roleList)
		if(modNames.indexOf(roleList[x].name)!=-1)
			if (msg.member.roles.has(roleList[x].id))
				return true;

	return false;
}

// Clears the Queue if the Queue is empty and messages 
// the owner/channel that the Queue no longer exists.
exports.clearIfEmpty = function (msg, table){

	if(0 == table[msg.channel].queued.length){
		msg.author.send("Queue cleared.");
		msg.channel.send("Queue cleared.");
		table[msg.channel]=undefined;
	}
}

// Returns true if the message autor is in the Queue
exports.isEnqueued = function (msg, table){

	for(x of table[msg.channel].queued)
		if(x==msg.author)
			return true;

	return false;
}

// Finds the first instance of the author if the message in the Queue. Returns -1 if not found
exports.findUser = function (msg, table){
	
	for(x=0; x<table[msg.channel].queued.length;x++)
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
