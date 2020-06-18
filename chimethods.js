// Create datawriter
const io=require('./datawriter.js');

// Set up defaults
const defaultNum=3;
const defaultDuplication=false;
const allowDM=true;
const defaultMaxPlayers=-1;
const defaultSendUseList=false;
const defaultUseJoinReact=true;
const defaultmaxAttempts=-1;
const defaultSendAfter=false;

pointsCache = {};

// Returns true if a Queue is active in the given channel
exports.hasQueue = function (msg, table){
	return table[msg.channel]!=undefined;
}

// Creates a QueueTable entry with all fields set to the universal defaults
// and 'owner' set to the message sender
exports.queueBase = function (msg){
	return {queued:[], owner:msg.author, size:defaultNum, dupes:defaultDuplication, 
		open:true, maxplayers:defaultMaxPlayers, banlist:[], sendUseList:defaultSendUseList,
		useJoinReact:defaultUseJoinReact, userTrack:{}, maxAttempts:defaultmaxAttempts,
		sendafter:defaultSendAfter};
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

	if(queue.sendUseList != defaultSendUseList)
		base.sendUseList=queue.sendUseList;
	
	if(queue.useJoinReact != defaultUseJoinReact)
		base.useJoinReact=queue.useJoinReact;
	
	if(queue.maxAttempts != defaultmaxAttempts)
		base.maxAttempts=queue.maxAttempts;
	
	if(queue.sendafter != defaultSendAfter)
		base.sendafter=queue.sendafter;
	
	if(queue.banlist.length!=0)
		base.banlist=queue.banlist;

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

	if(settings.sendUseList!=undefined && queue.sendUseList != settings.sendUseList){
		base.sendUseList=settings.sendUseList;
		queue.sendUseList=settings.sendUseList;
	}

	if(settings.useJoinReact!=undefined && queue.useJoinReact != settings.useJoinReact){
		base.useJoinReact=settings.useJoinReact;
		queue.useJoinReact=settings.useJoinReact;
	}

	if(settings.maxAttempts!=undefined && queue.maxAttempts != settings.maxAttempts){
		base.maxAttempts=settings.maxAttempts;
		queue.maxAttempts=settings.maxAttempts;
	}

	if(settings.sendafter!=undefined && queue.sendafter != settings.sendafter){
		base.sendafter=settings.sendafter;
		queue.sendafter=settings.sendafter;
	}


	if(settings.banlist!=undefined && queue.banlist != settings.banlist){
		base.banlist=settings.banlist;
		queue.banlist=settings.banlist;
	}

	return base;
}

// Save a User's settings if able
// Returns true if able, false otherwise
exports.saveSettings = async function (user, settings){
	
	return await io.saveUserPref(user, settings);
}

// Retrieve a User's settings if able
exports.readSettings = async function (user){
	
	return await io.readUserPref(user);
}

// Returns a promise to write the given table to memory
exports.saveTable = function (table, client){
	
	let internalGetSettings = this.getSettings;
	
	let stripChn = function (chn){
		return chn.replace(/[\\<>@#&!]/g, "");
	}
	
	return new Promise( async function (resolve, reject) {
		try{
			let striptable={};

			// Strip the empty Queues, and save only user IDs rather than full user data
			for(let x in table)
				if(table[x]!=undefined && table[x].owner!=undefined){
					
					let sx=stripChn(x);
					
					await client.channels.get(sx).send("Hold on, I need to reorganize.");
					
					striptable[sx]={};
					
					striptable[sx].settings=internalGetSettings(table[x]);
					striptable[sx].owner=table[x].owner.id;
					striptable[sx].open=table[x].open;
					striptable[sx].userTrack=table[x].userTrack;
					striptable[sx].queued=[];
					
					// Strip user IDs from those in Queue
					for(let y=0;y<table[x].queued.length;y++){
						if(table[x].queued[y]!=undefined)
							striptable[sx].queued.push(table[x].queued[y].id);
					}
				}
				
			await io.saveTableData(striptable).catch(er => {throw er;});
			
			resolve(true);
		}
		catch(err){
			reject(err);
		}
	});
}

// Loads the last known set of Queues if it exists
exports.loadTable = function (table, client){
	
	let internalTableBase = this.queueBase;
	let internalSetSettings  = this.setSettings;
	
	let compChn = function (chn, clientn){
		return clientn.channels.get(chn);
	}
	
	let compUser = function (id, chn){
		return chn.members.get(id);
	}
	
	return new Promise( async function (resolve, reject) {
		try{
			// Get the table info from file
			let tablebase = await io.loadTableData().catch(er => {throw er;});

			// Fill the missing data from the stripped down version
			for(let x in tablebase){
				
				let sx=compChn(x, client);
					
				let own=compUser(tablebase[x].owner,sx);
				
				if(own == undefined)
					continue;
										
				table[sx]={};
				
				table[sx] = internalTableBase({author:own});
				internalSetSettings(table[sx], tablebase[x].settings);
				
				table[sx].open=tablebase[x].open;
				table[sx].userTrack=tablebase[x].userTrack;
					
				// Add user IDs back into tyhe Queue
				for(let y=0;y<tablebase[x].queued.length;y++){
					let user=compUser(tablebase[x].queued[y], sx);
					
					if(user!=undefined)
						table[sx].queued.push(user);
				}

				sx.send("There we go. Continue as you were.");
			}
			
			resolve(true);
		}
		catch(err){
			reject(err);
		}
	});
}

// Returns true iff the user is the owner of a given channel's Queue
exports.isOwner = function (msg, table){
	return table[msg.channel].owner.id==msg.author.id;
}

// Returns the index of their ban iff the user is banned from a given channel, -1 if not banned.
exports.checkBan = function (user, banlist){

	for(let x=0; x<banlist.length;x++)
		if(user==banlist[x])
			return x;

	return -1;
}

// Returns true if the user is under the max attempts for a channel
exports.attemptAvailable = function (msg, table){
	
	if(table[msg.channel].maxAttempts==-1)
		return true;

	if(table[msg.channel].userTrack[msg.author.id]==undefined)
		return true;

	return table[msg.channel].userTrack[msg.author.id]<table[msg.channel].maxAttempts;
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

// Returns true iff the user has a given role in a given channel
exports.hasRole = function (msg, role){

	let roleList = msg.guild.roles.array();
		
	for(let x in roleList)
		if(role == roleList[x].name){
			if (msg.member.roles.has(roleList[x].id))
				return true;
			return false;
		}

	return false;
}

// Returns a string representing the current configuration in readable English
exports.stringifyConfig = function (config, table, msg){

	let replyms="";

	if(config.maxplayers!=undefined) replyms+=(config.maxplayers/table[msg.channel].size)+" rooms. ";
	if(config.size!=undefined) replyms+=config.size+" to a room. ";
	if(config.dupes!=undefined){
		if(config.dupes)
			replyms+="With duplicates allowed. ";
		else
			replyms+="With no duplicates allowed. ";
	}
	if(config.useJoinReact!=undefined){
		if(config.useJoinReact)
			replyms+=".joins will be acknowledged by reacts. ";
		else
			replyms+=".joins will be acknowledged by DM. ";
	}
	if(config.sendUseList!=undefined){
		if(config.sendUseList)
			replyms+="You will be notified of who joins. ";
		else
			replyms+="You will not be notified of who joins. ";
	}
	if(config.maxAttempts!=undefined){
		if(config.maxAttempts==-1)
			replyms+="Each user may join any number of times. ";
		else{
			replyms+="Each user may join "+config.maxAttempts;
			
			if(config.maxAttempts==1)
				replyms+=" time. ";
			else
				replyms+=" times. ";
		}
	}
	if(config.sendafter!=undefined){
		if(config.sendafter)
			replyms+="You will be notified of how many people join. ";
		else
			replyms+="You will not be notified of how many people join. ";
	}
	if(config.banlist!=undefined) replyms+="You have "+config.banlist.length+" users blocked. ";

	return replyms;
}

// Clears the Queue if the Queue is empty and messages the owner/channel that the Queue no longer exists.
// Returns true if the channel was cleared.
exports.clearIfEmpty = function (msg, table, chn){

	if(0 == table[chn].queued.length){
		
		msg.author.send("Queue cleared.");
		if(table[chn].sendafter)
			msg.author.send(Object.keys(table[chn].userTrack).length+ " unique users joined.");
		
		chn.send("Queue cleared.");
		table[chn]=undefined;

		return true;
	}
	
	return false;
}

// Finds the first instance of the author if the message in the Queue. Returns -1 if not found
exports.findUser = function (msg, table){
	
	for(let x=0; x<table[msg.channel].queued.length;x++)
		if(table[msg.channel].queued[x].id==msg.author.id)
			return x;	

	return -1;
}

// Returns true if the message author is in the Queue
exports.isEnqueued = function (msg, table){

	for(let x of table[msg.channel].queued)
		if(x.id==msg.author.id)
			return true;

	return false;
}

// Finds the first instance of the user in the Queue. Returns -1 if not found
exports.findOtherUser = function (msg, user, table){
	
	let strippedID=user.replace(/[\\<>@#&!]/g, "");
	
	for(let x=0; x<table[msg.channel].queued.length;x++)
		if(table[msg.channel].queued[x].id==strippedID)
			return x;	

	return -1;
}

// Returns a string containing a random number from 0000 to 9999
exports.randomCode = function (){
	
	let coderaw=Math.floor(Math.random() * 100000000);
	

	let code=""+coderaw;

	if(coderaw<1) code="0"+code;
	if(coderaw<10) code="0"+code;
	if(coderaw<100) code="0"+code;
	if(coderaw<1000) code="0"+code;
	if(coderaw<10000) code="0"+code;
	if(coderaw<100000) code="0"+code;
	if(coderaw<1000000) code="0"+code;
	if(coderaw<10000000) code="0"+code;

	code = code.substr(0, 4) + '-' + code.substr(4);
	
	return code;
}

// Returns true if the Queue is in restricted mode and all spots are accounted for.
exports.isFilled = function (msg, table){
	
	if(table[msg.channel].maxplayers == -1)
		return false;

	return table[msg.channel].queued.length >= table[msg.channel].maxplayers;

} 

// Assembles a string containing mentions of all IDs passed
exports.stringifyIDs = function (ids){
	
	let res='';
	
	for(let x of ids){
		res+='<@'+x+'> ';
	}
	
	return res;
}

// Creates a DMTable entry with all fields set to the provided values
exports.dmBase = function (chn, code){
	return {queue:chn, allowed:allowDM, lastcode: code};
}

// Kicks all instances of the given user. Returns true if at least one user was kicked this way.
exports.kickUser = function (msg, user, table){
	
	let ispastfill=this.isFilled(msg, table);
	let xx=this.findOtherUser(msg, user, table);

	if(xx==-1)
		return false;

	while(xx!=-1){
		table[msg.channel].queued.splice(xx,1);
		xx=this.findOtherUser(msg, user, table);
	}

	if(ispastfill && !this.isFilled(msg, table))
		msg.channel.send("A spot has opened! Join while you can.");
		
	if(!table[msg.channel].open)
		this.clearIfEmpty(msg, table, msg.channel);

	return true;
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
	let totaltext="";

	for(var i=0;i<table[chn].size;i++){
		// Get a user 
		let user=table[chn].queued.shift();
		
		while(user == undefined)
			user=table[chn].queued.shift();
	
		if(table[chn].sendUseList)
			totaltext+=user+" ";

		// Track number of times user has joined of relevant, and number of users that have joined
		if (table[chn].maxAttempts==-1)
			table[chn].userTrack[user.id]=-1;
		else{
			if(table[chn].userTrack[user.id]==-1||table[chn].userTrack[user.id]==undefined)
				table[chn].userTrack[user.id]=0;
			table[chn].userTrack[user.id]++;
		}

		user.send("Your join code for "+chn.name+" is "+code+". The lobby is going up soon. If you miss your chance, you'll need to join the queue again.").catch(err => msg.channel.send('Unable to alert a player of the code.'));

		total++;

		// If no users remain in the Queue, force a loop break
		if(table[chn].queued.length==0){
			i=table[chn].size;
		}
	}

	let tosend="";

	// Alert Queue owner to the code and how many to expect
	if(total == 1) tosend="The code is "+code+". "+total+" user is joining.";
	else tosend="The code is "+code+". "+total+" users are joining.";

	if(table[chn].sendUseList)
		tosend+="\nJoining users: "+totaltext;

	msg.author.send(tosend);

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

	// Track number of times user has joined of relevant, and number of users that have joined
	if (table[chn].maxAttempts==-1)
		table[chn].userTrack[user.id]=-1;
	else{
		if(table[chn].userTrack[user.id]==-1||table[chn].userTrack[user.id]==undefined)
			table[chn].userTrack[user.id]=0;
		table[chn].userTrack[user.id]++;
	}

	user.send("Your join code for "+chn.name+" is "+code+". The lobby is up now. If you miss your chance, you'll need to join the queue again.").catch(err => msg.channel.send('Unable to alert a player of the code.'));

	let tosend="The next in queue has been sent a code.";

	if(table[chn].sendUseList)
		tosend+="\nJoining user: "+user;

	msg.author.send(tosend);

	if(!table[chn].open || table[chn].maxplayers == 0)
		if(this.clearIfEmpty(msg, table, chn))
			dmtable[msg.author] = undefined;
}

// Points Methods
const Discord = require('discord.js');

// Takes a guild ID and returns the pointcache for that ID, either loading or pulling from the cache
exports.retrievePointsCache = async function(guild){
	if(pointsCache[guild] != undefined)
		return pointsCache[guild];
	let temp = await io.loadPoints(guild);
	let tt = {state: temp, messagecache: {}}
	pointsCache[guild] = tt;
	return tt;
}

// Initalizes a fresh data structure if none exists
exports.initPoints = async function(guild){
	try{
		await this.retrievePointsCache(guild);
	}
	catch(err){
		let temp = {messages: {}, data: {}, init: true}
		let tt = {state: temp, messagecache: {}}
		pointsCache[guild] = tt;
		return io.savePoints(guild, temp);
	}
	throw new Error('Data already exists');
}

// Takes the link to the bot, a cachechunk, and message handle and returns a link to the message, pulling from cache if possible
// If message does not exist, returns false and clears from listeners
exports.retrieveMessage = async function(bot, cachechunk, name){
	if(cachechunk.messagecache[name] != undefined){
		/*let r = await cachechunk.messagecache[name].fetch().catch(err => {
			console.log(err.stack);
			return false;});*/
		r = cachechunk.messagecache[name];
		//console.log(r.deleted);
		if(r.deleted){
			for(let x in cachechunk.state.messages[name].components)
				cachechunk.state.data[cachechunk.state.messages[name].components[x]].listeners.messages.splice(
					cachechunk.state.data[cachechunk.state.messages[name].components[x]].listeners.messages.indexOf(name), 1);
			cachechunk.messagecache[name] = undefined;
			cachechunk.state.messages[name] = undefined;
			return false;
		}
		//console.log(r);
		return r;
	}
	let temp = cachechunk.state.messages[name];
	if(temp == undefined)
		return false;
	let res = bot.channels.get(temp.channel);
	try{
		res = await res.fetchMessage(temp.id);
		//console.log(res.deleted);
	}
	catch(delerr){
		console.log('Working');
		for(let x in cachechunk.state.messages[name].components)
			cachechunk.state.data[cachechunk.state.messages[name].components[x]].listeners.messages.splice(
				cachechunk.state.data[cachechunk.state.messages[name].components[x]].listeners.messages.indexOf(name), 1);
		cachechunk.messagecache[name] = undefined;
		cachechunk.state.messages[name] = undefined;
		return false;
	}
	if(res.deleted){
		console.log('Working');
		for(let x in cachechunk.state.messages[name].components)
			cachechunk.state.data[cachechunk.state.messages[name].components[x]].listeners.messages.splice(
				cachechunk.state.data[cachechunk.state.messages[name].components[x]].listeners.messages.indexOf(name), 1);
		cachechunk.messagecache[name] = undefined;
		cachechunk.state.messages[name] = undefined;
		return false;
	}
	cachechunk.messagecache[name] = res;
	//console.log(res);
	return res;
}

// Takes a messages entry (with at least name and components field), and the data block of the points cache and returns a formatted message 
// Any components that do not exist are removed from the message components list.
exports.createPointsMsg = function(message, data){
	if(message == undefined)
		return 'Counters cleared';
	let ex = true;
	let res = new Discord.RichEmbed().setTitle(message.name);
	for(let x =0; x < message.components.length; x++){
		let temp = data[message.components[x]];
		if(temp == undefined){
			message.components.splice(x,1);
			x--;
			continue;
		}
		res = res.addField(message.components[x], temp.value, true);
		ex = false;
	}
	if(ex) return 'Counters cleared';
	return res;
}

// Creates a new point counter. Can either be a composite counter or a new counter. 
// Takes 4 arguments; the active bot, the guild ID, the name of the new counter, and the components/inital value
// Returns a promise to the save state if the given named is added or false if not
exports.createPoints = async function(bot, guild, name, initval){
	let pointss = await this.retrievePointsCache(guild);
	pointss = pointss.state;
	let points = pointss.data;
	
	if(points[name] != undefined)
		return false;
	
	if(isNaN(initval)){
		let cu = 0;
		for(let x in initval){
			let nam = initval[x];
			if(points[nam] == undefined)
				return false;
			cu += points[nam].value;
		}
		for(let x in initval){
			let nam = initval[x];
			points[nam].listeners.data.push(name);
		}
		
		points[name] = {value: cu, components: initval, listeners: {data: [], messages:[]}};
	}
	else{
		points[name] = {value: initval, listeners: {data: [], messages:[]}};
	}
	
	return io.savePoints(guild, pointss);
}

// Modifies a point value, and updates any poiints in that value's listener list
// Takes 5 arguments; the active bot, guildID, name of the counter to be modified, the value to modify by, and if it is to be set
// Returns a promise to the save state if the given named is changed or false if not
exports.modifyPoints = async function(bot, guild, name, value, set){
	let pointss = await this.retrievePointsCache(guild);
	
	if(pointss.state.data[name] == undefined)
		return false;
	if(set)
		value = value - pointss.state.data[name].value;
	if(value == 0)
		return false;
	if(isNaN(value))
		throw new TypeError('Setting a value takes a number.');
	
	// internal recursoive funtion to update all listeners, returns a list of message listeners
	let updateWalker = function(datadata, currname){
		datadata[currname].value = Number(datadata[currname].value) + Number(value);
		if(datadata[currname].listeners.data.length == 0)
			return datadata[currname].listeners.messages;
		let collatedarray = datadata[currname].listeners.messages;
		for(let x in datadata[currname].listeners.data)
			collatedarray = collatedarray.concat(updateWalker(datadata, datadata[currname].listeners.data[x]));
		//console.log(currname + ' '+ collatedarray);
		return collatedarray;
	}
	
	let walkingMes = updateWalker(pointss.state.data, name);
	let updatedmes = [];
	for(let n in walkingMes){
		let y = walkingMes[n];
		if(updatedmes.indexOf(y) != -1) continue;
		let k = await this.retrieveMessage(bot, pointss, y);
		if(k === false){
			updatedmes.push(y);
			continue;
		}
		try{
			k.edit(this.createPointsMsg(pointss.state.messages[y], pointss.state.data));
			//await k.edit(this.createPointsMsg(pointss.state.messages[y], pointss.state.data)).then(_=>console.log('S')).catch(_=>console.log('V'));
		}
		catch(err){
			pointss.messagecache[y] = undefined;
			await this.retrieveMessage(bot, pointss, y);
		}
		updatedmes.push(y);
	}
	
	return io.savePoints(guild, pointss.state);
}

// Deletes a point counter
// Takes 3 arguments; the active bot, guildID, name of the counter to be deleted
// Returns a promise to the save state if the given named is deleted or false if not
exports.delPoints = async function(bot, guild, name){
	let pointss = await this.retrievePointsCache(guild);
	
	if(pointss.state.data[name] == undefined)
		return false;
	
	return this.modifyPoints(bot, guild, name, 0, true).then(async _=>{
		// Remove from any compound counters
		for(let xy in pointss.state.data[name].listeners.data){
			let x = pointss.state.data[name].listeners.data[xy];
			try{
				let xx = pointss.state.data[x].components.indexOf(name);
				
				while(xx != -1){
					pointss.state.data[x].components.splice(xx, 1);
					xx = pointss.state.data[x].components.indexOf(name);
				}
				
				// If this was the last component of a compound counter, delete the compound counter
				if(pointss.state.data[x].components.length == 0)
					await this.delPoints(bot, guild, x);
			}
			catch(err){
				console.log(err.stack);
			}
		}
		
		// If compound, remove from any listener lists
		if(pointss.state.data[name].components != undefined){
			for(let xy in pointss.state.data[name].components){
				let x = pointss.state.data[name].components[xy];
				try{
					let xx = pointss.state.data[x].listeners.data.indexOf(name);
				
					while(xx != -1){
						pointss.state.data[x].listeners.data.splice(xx, 1);
						xx = pointss.state.data[x].listeners.data.indexOf(name);
					}
				}
				catch(err){
					console.log(err.stack);
				}
			}
		}
		
		let temt = pointss.state.data[name].listeners.messages;
		pointss.state.data[name] = undefined;
		
		// Remove from any message listeners, and clear from that message
		for(let n in temt){
			let y = temt[n];
			let k = await this.retrieveMessage(bot, pointss, y);
			if(k === false)
				continue;
			try{
				k.edit(this.createPointsMsg(pointss.state.messages[y], pointss.state.data));
				//await k.edit(this.createPointsMsg(pointss.state.messages[y], pointss.state.data)).then(_=>console.log('SD')).catch(_=>console.log('VD'));
			}
			catch(err){
				pointss.messagecache[y] = undefined;
				await this.retrieveMessage(bot, pointss, y);
			}
			if(pointss.state.messages[y].components.length == 0)
				pointss.state.messages[y] = undefined;
		}
		
		return io.savePoints(guild, pointss.state);
	});
}

// Creates a visable representation of a points counter.
// Takes 3 arguments; the calling message, a name, and a list of components
exports.displayPoints = async function(msg, name, components){
	let pointss = await this.retrievePointsCache(msg.guild.id);
	let temp = {name: name, components: components};
	let sendb = this.createPointsMsg(temp, pointss.state.data);
	
	let sent = await msg.channel.send(sendb);
	
	temp.id = sent.id;
	temp.channel = sent.channel.id;
	
	let nme = temp.id + '.' +temp.channel;
	
	for(x in temp.components){
		pointss.state.data[temp.components[x]].listeners.messages.push(nme);
	}
	
	pointss.state.messages[nme] = temp;
	
	return io.savePoints(msg.guild.id, pointss.state);
}

