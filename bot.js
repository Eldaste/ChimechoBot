// Set authentication method and if whitelist or blacklist
const useAuthFile=false;
const useWhitelist=true;

// Import required libraries
const Discord = require('discord.js');
const botMethods= require('./chimethods.js');

// Import required tables (authentication, blacklist, definition table)
if(useAuthFile)
	var auth = require('./auth.json');
const blackfile = require('./blacklist.json');
const definitionsFile = require('./definitions.json');

// Set up client
const client = new Discord.Client();
if(useWhitelist)
	var channelWhitelist=blackfile.whitelisted;
else
	var channelBlacklist=blackfile.blacklisted;

// Set up the fileEditor for saving settings
const fs = require('fs'); 

// Set up defaults
const prefix='.';
const rebootlag=5000;
const errorFile="errorfile.log";
//const transferFile="temp.json";

const joinReact="646542193934336000";
// Relevant reactions:
//	TestChannel Chime: 671883056617095179
//	MaxRaid +: 646542193934336000

// Set up blank QueueTable. The QueueTable holds the active Queues and all information needed to run them (all settings and the like).
var QueueTable={};

// Set up blank DMTable. The DMTable is used for anything that involves any DM functionallity.
var DMTable={};

// Set up the shutdown listener
var shutdown = false;

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
	
	await new Promise(resolve => setTimeout(resolve, rebootlag));
	
	botMethods.loadTable(QueueTable, client);
});


client.on('message', async msg => {
  try{
	  
	// If shutting down, ignore all commands
	if(shutdown)
		return;

    // Escape if channel is in the blacklist or it is a message of the bot
	if (useWhitelist){
		if (msg.author == client.user)
			return;
    }
	else
		if (channelBlacklist.indexOf(msg.channel.id) != -1 || msg.author == client.user)
			return;

    // Extract content for easier manipulation
    let message=msg.content;

    // Handle DMs
	if (msg.channel.type == "dm"){
	
		// If user isn't expected, ignore the message
		if(DMTable[msg.author]==undefined)
			return;

		// Handle in-DM commands
		let args = message.split(' ');
		let cmd = args[0];

		if(DMTable[msg.author].lastcode=='nil' && !(args[0]=='numQ' || args[0]=='.numQ' || args[0]=='diagnose'))
			return;

		switch(cmd.toLowerCase()) {
			case 'next':
			case '.next': // Call a new group on the Queue that was just sent.
				botMethods.createGroup(msg, QueueTable, DMTable, true);
				break;

			case 'add':
			case '.add': // Add a member to the last group on the Queue that was just sent.
				botMethods.addMember(msg, QueueTable, DMTable, true);
				break;

			case 'up':
			case '.up': // Sends a message to the channel that a room is up.
				if (QueueTable[DMTable[msg.author].queue] == undefined || msg.author != QueueTable[DMTable[msg.author].queue].owner){
					msg.reply("An error has occured. Manually set up another Queue from the Queue thread.");
					DMTable[msg.author]=undefined;
					return;
				}

				DMTable[msg.author].queue.send("The lobby is up now. Join in if you have a code!");
				
				break;

			case 'numq':
			case '.numq': // DM version of numQ
				if(QueueTable[DMTable[msg.author].queue] == undefined){
					DMTable[msg.author]==undefined;
					msg.author.send("The Queue no longer exists.");
					break;
				}

				let cludgemsg={author:msg.author, channel:DMTable[msg.author].queue};
				let y=botMethods.findUser(cludgemsg, QueueTable);

				if(y==-1){
					msg.author.send("You are not in the Queue.");
				}
				else{
					msg.author.send("You are in position "+(y+1)+" of the Queue.");
				}
				
				break;

			case 'diagnose': // Send the contents of the errorfile
				msg.author.send("Sending...");

				fs.readFile(errorFile,'utf8', function(err, datat) {
					msg.author.send(datat).catch(function(error) {msg.author.send("I'm feeling fine.");});
				});
				
				break;

		} // End Switch

		return;
    } // End DM handle

    // If using the Whitelist, check if channel is on it
	if (useWhitelist && !message.startsWith(prefix + 'point'))
		if (channelWhitelist.indexOf(msg.channel.id) == -1)
			return;

    // Check if command for the bot
	if (message.startsWith(prefix)) {

		// Remove command indicatior prefix and split into args and command
		let args = message.substring(prefix.length).split(' ');
		let cmd = args[0];
		args = args.splice(1);

		// Parse Command
		switch(cmd.toLowerCase()) {

			case 'createq': // Creates a Queue in the given channel if one does not exist already

				if(botMethods.hasQueue(msg, QueueTable)){
					msg.reply("This channel has an active Queue.");
					break;
				}
				QueueTable[msg.channel]=botMethods.queueBase(msg);
				msg.reply("Queue created.");

				break;

			case 'version': // Let's user know what version is running

				let vers=require('./package.json').version;

				if(args.length != 0 && args[0] == 'new'){
					if(args.length != 1)
						msg.channel.send("New features as of version "+args[1]+":\n"+require('./versioninfo.json')[args[1]]);
					else
						msg.channel.send("New features as of version "+vers+":\n"+require('./versioninfo.json')[vers]);
				}
				else
					msg.channel.send("I'm currently running version "+vers);

				break;

			case 'deleteq': // Removes the Queue if sent by the Queue owner
				if(!botMethods.hasQueue(msg, QueueTable)){
					msg.reply("No active Queue.");
					break;
				}
				if(!botMethods.isOwner(msg, QueueTable)){
					msg.reply("Invalid Permissions.");
					break;
				}

				QueueTable[msg.channel]=undefined;
				msg.reply("Queue cleared.");

				break;
				
			case 'code': // Generates a random code, functions if Q owner or if no Q exists
				if(botMethods.hasQueue(msg, QueueTable)){
					if(!botMethods.isOwner(msg, QueueTable)){
						msg.reply("Codes will be sent to you when it's your turn. Make sure to have DMs enabled to recieve the code.");
						break;
					}
				}

				msg.channel.send("Your random code is: " + botMethods.randomCode());

				break;


			case 'mod': // Commands only usable by mods of the server, these commands ignore owner
				if(!botMethods.hasQueue(msg, QueueTable)){
					msg.reply("No active Queue.");
					break;
				}		
				if(!botMethods.isMod(msg, definitionsFile.modNames)){
					msg.reply("Invalid Permissions.");
					break;
				}
				if(args.length == 0){
					msg.reply("What would like to do? Use \".mod help\" for available options.");
					break;
				}

				switch(args[0].toLowerCase()) {
					
					case 'delete': // Deletes the Queue
						QueueTable[msg.channel]=undefined;
						msg.reply("Queue cleared.");
						
						break;
						
					case 'view': // Sends the mod the Queue
						if(QueueTable[msg.channel].queued.length==0){
							msg.author.send("Queue is empty.");
							break;
						}
				
						msg.author.send(QueueTable[msg.channel].queued);
						
						break;
						
					case 'viewjoined': // Sends a list of all unique uses that have been sent a code
						let tempt=[];
						
						for(let poss in QueueTable[msg.channel].userTrack){
							tempt.push(poss);
						}
						
						if(tempt.length==0){
							msg.author.send('No user has been sent a code yet.');
							break;
						}
						
						msg.author.send(botMethods.stringifyIDs(tempt));
						
						break;
						
					case 'kick':
					case 'boot': // Kick a user from the Queue
						if(args.length == 1){
							msg.reply("Who would you like to kick? Kicking needs a command of the form boot <user>.");
							break;
						}

						if(botMethods.kickUser(msg, args[1], QueueTable))
							msg.reply(args[1]+" has been kicked.");
						else
							msg.reply(args[1]+" was not in the Queue.");

						break;
						
					case 'echo': // Send a message in the designated channel
						if(args.length == 1){
							msg.reply("Where would you like to send a message? Echo needs a command of the form echo <channel> <message>.");
							break;
						}
						if(args.length == 2){
							msg.reply("What message would you like to send? Echo needs a command of the form echo <channel> <message>.");
							break;
						}
						
						let tar = args[1].replace(/[\\<>@#&!]/g, "");
						let tocom = args.splice(2);
						tocom = tocom.join(' ');
						
						client.channels.get(tar).send(tocom);
						
						break;
					case 'observe': // Send owner to requester
						msg.author.send("Owner: " + QueueTable[msg.channel].owner);
						
						break;
					case 'reload': // Reloads from tempfile, for use in odd cases of reboot failure
						botMethods.loadTable(QueueTable, client).then(_=>{msg.channel.send('Tables reloaded.');}).catch(_=>{msg.channel.send('Tables failed to reload.');});
						
						break;
					case 'cleartmp': // Clears the tempfile
						botMethods.saveTable({}, client).then(_=>{msg.channel.send('External cache cleared.');}).catch(_=>{msg.channel.send('Error clearing cache.');});
							
						break;
					case 'help': // Displays the mod help menu
	
						msg.channel.send(definitionsFile.modhelptext);

						break;
				}
				
				break;
				
			case 'point': // Commands for point manipulations		
				if(!botMethods.isMod(msg, definitionsFile.modNames)){
					break;
				}
				if(args.length == 0){
					msg.reply("What would like to do?");
					break;
				}
				
				switch(args[0].toLowerCase()){
					case 'init': // Needs to be called before anything else
						try{
							await botMethods.initPoints(msg.guild.id);
							msg.reply('Points initalized.');
						}
						catch(e){
							msg.reply('Points either already initalized or an error occurred.');
						}
						break;
					case 'create': // Create a base level point counter
						if(args.length == 1){
							msg.reply("What name would you like it to have?");
							break;
						}
						if(await botMethods.createPoints(client, msg.guild.id, args[1], 0) != false)
							msg.reply('Points counter created.');
						break;
					case 'define': // Create a conglomerate point counter
						if(args.length < 3){
							msg.reply("Define takes at least 2 arguments.");
							break;
						}
						if(await botMethods.createPoints(client, msg.guild.id, args[1], args.splice(2)) != false)
							msg.reply('Compound points counter created.');
						break;
					case 'delete': // Remove a point counter
						if(args.length == 1){
							msg.reply("What counter would you like to delete?");
							break;
						}
						if(await botMethods.delPoints(client, msg.guild.id, args[1]) != false)
							msg.reply('Points counter deleted.');
						break;
					case 'award': // Increment a counter
						if(args.length < 3){
							msg.reply("Award takes 2 arguments.");
							break;
						}
						if(await botMethods.modifyPoints(client, msg.guild.id, args[1], args[2], false) != false)
							msg.reply('Points awarded.');
						break;
					case 'set': // Set a counter
						if(args.length < 3){
							msg.reply("Set takes 2 arguments.");
							break;
						}
						if(await botMethods.modifyPoints(client, msg.guild.id, args[1], args[2], true) != false)
							msg.reply('Points set.');
						break;
					case 'display': // Displays the given points
						if(args.length < 3){
							msg.reply("Display takes at least 2 arguments.");
							break;
						}
						await botMethods.displayPoints(msg, args[1], args.splice(2));
						break;
					case 'help': // Displays the point help menu
	
						msg.channel.send(definitionsFile.pointhelptext);

						break;
				}			
				break;

			case 'closeq': // Closes Queue to further joins and deletes the Queue if empty
				if(!botMethods.hasQueue(msg, QueueTable)){
					msg.reply("No active Queue.");
					break;
				}
				if(!botMethods.isOwner(msg, QueueTable)){
					msg.reply("Invalid Permissions.");
					break;
				}

				QueueTable[msg.channel].open=false;

				msg.channel.send("Queue closed, no further joins allowed.");

				botMethods.clearIfEmpty(msg, QueueTable, msg.channel);
				
				break;


			case 'openq': // Reopens Queue to further joins if it exists
				if(!botMethods.hasQueue(msg, QueueTable)){
					msg.reply("No active Queue.");
					break;
				}
				if(!botMethods.isOwner(msg, QueueTable)){
					msg.reply("Invalid Permissions.");
					break;
				}

				QueueTable[msg.channel].open=true;
				msg.channel.send("Queue reopened, joins allowed.");
				
				break;


			case 'join': // Joins the Queue. Checks to prvent duplications if dupes is false
				if(!botMethods.hasQueue(msg, QueueTable)){
					msg.reply("No active Queue.");
					break;
				}
				if(!QueueTable[msg.channel].open){
					msg.reply("Queue closed.");
					break;
				}
				if(botMethods.isFilled(msg, QueueTable)){
					msg.reply("Queue filled. Wait to see if a user leaves.");
					break;
				}
				if(botMethods.checkBan(msg.author.id, QueueTable[msg.channel].banlist)!=-1){
					msg.reply("You are currently blocked from joining this host's queues.");
					break;
				}
				if(!botMethods.attemptAvailable(msg, QueueTable)){
					let rpl="You have already used your "+QueueTable[msg.channel].maxAttempts;
					if(QueueTable[msg.channel].maxAttempts==1)
						rpl+=" attempt.";
					else
						rpl+=" attempts.";
					msg.reply(rpl);
					break;
				}

				if(!QueueTable[msg.channel].dupes && botMethods.isEnqueued(msg, QueueTable))
					msg.reply("You are already Queued");
				else{
					QueueTable[msg.channel].queued.push(msg.author);

					if(QueueTable[msg.channel].useJoinReact)
						msg.react(joinReact);
					else{
						msg.author.send("You have joined in position "+(botMethods.findUser(msg, QueueTable)+1)+" of the Queue.");
						msg.delete();
					}
			
					if(botMethods.isFilled(msg, QueueTable))
						msg.channel.send("Queue filled.");
				}
	
				break;

			case 'leave': // Leaves the Queue. Only removes first instance of the user
				if(!botMethods.hasQueue(msg, QueueTable)){
					msg.reply("No active Queue.");
					break;
				}

				let x=botMethods.findUser(msg, QueueTable);
				let ispastfil=botMethods.isFilled(msg, QueueTable);

				if(x!=-1){
					QueueTable[msg.channel].queued.splice(x,1);
					msg.reply("You have been removed.");
				}

				if(ispastfil && !botMethods.isFilled(msg, QueueTable) && QueueTable[msg.channel].open)
					msg.channel.send("A spot has opened! Join while you can.");
		
				if(!QueueTable[msg.channel].open)
					botMethods.clearIfEmpty(msg, QueueTable, msg.channel);
				
				break;

			case 'numq': // Displays the user's first spot in the Queue
				if(!botMethods.hasQueue(msg, QueueTable)){
					msg.reply("No active Queue.");
					break;
				}

				let y=botMethods.findUser(msg, QueueTable);

				if(y==-1){
					msg.author.send("You are not in the Queue.");
				}
				else{
					msg.author.send("You are in position "+(y+1)+" of the Queue.");
					DMTable[msg.author]=botMethods.dmBase(msg.channel, 'nil');
				}

				msg.delete();

				break;

			case 'viewq': // Sends Queue owner a list of evryone in the Queue 
				if(!botMethods.hasQueue(msg, QueueTable)){
					msg.reply("No active Queue.");
					break;
				}
				if(!botMethods.isOwner(msg, QueueTable)){
					msg.reply("Invalid Permissions.");
					break;
				}
				if(QueueTable[msg.channel].queued.length==0){
					msg.author.send("Queue is empty.");
					break;
				}
				
				msg.author.send(QueueTable[msg.channel].queued);
				
				break;

			case 'countq': // Sends Queue owner how many are in the Queue 
				if(!botMethods.hasQueue(msg, QueueTable)){
					msg.reply("No active Queue.");
					break;
				}
				if(!botMethods.isOwner(msg, QueueTable)){
					msg.reply("Invalid Permissions.");
					break;
				}
				if(QueueTable[msg.channel].queued.length==0){
					msg.author.send("Queue is empty.");
					break;
				}
				if(QueueTable[msg.channel].queued.length==1){
					msg.author.send("There is 1 person in the Queue.");
					break;
				}
				
				msg.author.send("There are "+QueueTable[msg.channel].queued.length+" people in the Queue");
	    
				break;

			case 'activequeues': // For use in identifying when matinenece is safe
				let num=0;

				for(let x in QueueTable)
					if(QueueTable[x]!=undefined)
						num++;

				console.log(num);
				
				break;

			case 'next': // Sends the next set of users a random code.
				if(!botMethods.hasQueue(msg, QueueTable)){
					msg.reply("No active Queue.");
					break;
				}
				if(!botMethods.isOwner(msg, QueueTable)){
					msg.reply("Invalid Permissions.");
					break;
				}
		
				botMethods.createGroup(msg, QueueTable, DMTable, false);

				break;

			case 'add': // Sends the next user the same code that the last group had.
				if(!botMethods.hasQueue(msg, QueueTable)){
					msg.reply("No active Queue.");
					break;
				}
				if(!botMethods.isOwner(msg, QueueTable)){
					msg.reply("Invalid Permissions.");
					break;
				}
				if(DMTable[msg.author].queue!=msg.channel){
					msg.reply("Your last group was in a different channel. Please use .next to make one in this channel.");
					break;
				}
		
				botMethods.addMember(msg, QueueTable, DMTable, false);

				break;

			case 'save': // Saves the Queue settings for a given user.
				if(!botMethods.hasQueue(msg, QueueTable)){
					msg.reply("No active Queue.");
					break;
				}
				if(!botMethods.isOwner(msg, QueueTable)){
					msg.reply("Invalid Permissions.");
					break;
				}

				if(await botMethods.saveSettings(msg.author, botMethods.getSettings(QueueTable[msg.channel])))
					msg.reply("I think I've got all that. I'll have everything ready for you next time you ring.");
				else
					msg.reply('Oh dear. I seem to have dropped my notes. Would you mind trying that again?');

				break;

			case 'ring': // Creates a Queue in the given channel if one does not exist already with the User's saved settings if possible.

				if(botMethods.hasQueue(msg, QueueTable)){
					msg.reply("This channel has an active Queue.");
					break;
				}

				QueueTable[msg.channel]=botMethods.queueBase(msg);

				let changed=botMethods.setSettings(QueueTable[msg.channel], await botMethods.readSettings(msg.author));
				let replyms="";
	
				replyms=botMethods.stringifyConfig(changed, QueueTable, msg);

				if(replyms=="")
					replyms="Ring-a-Ding! "+msg.author+", your queue has been created!";
				else
					replyms="Ring-a-Ding! "+msg.author+", your queue has been created just how you like it! "+replyms;

				msg.channel.send(replyms);

				break;

			case 'help': // Displays the help menu with a list of commands usable by the average user.

				if(!botMethods.hasQueue(msg, QueueTable))
					msg.channel.send(definitionsFile.helptext);
				else if(botMethods.isOwner(msg, QueueTable))
					msg.channel.send(definitionsFile.helptextown);
				else
					msg.channel.send(definitionsFile.helptextjoiner);

				break;

	    /*case 'echo': // Debug Command
		
		if(args.length == 0){
			msg.reply("What would like to echo?");
			break;
		}
			msg.channel.send(args[0]);

	    break;*/

			case 'ugg':
			case 'boot': // Kicks all instances of the user from the Queue
				if(!botMethods.hasQueue(msg, QueueTable)){
					msg.reply("No active Queue.");
					break;
				}
				if(!botMethods.isOwner(msg, QueueTable)){
					msg.reply("Invalid Permissions.");
					break;
				}
				if(args.length == 0){
					msg.reply("Who would you like to kick? Kicking needs a command of the form "+prefix+"boot <user>.");
					break;
				}

				if(botMethods.kickUser(msg, args[0], QueueTable))
					msg.reply(args[0]+" has been kicked.");
				else
					msg.reply(args[0]+" was not in the Queue.");

				break;

			case 'yeet':
			case 'block':
			case 'ban': // Kicks all instances of the user from the Queue and prevents them from joining. Saved in .save
				if(!botMethods.hasQueue(msg, QueueTable)){
					msg.reply("No active Queue.");
					break;
				}
				if(!botMethods.isOwner(msg, QueueTable)){
					msg.reply("Invalid Permissions.");
					break;
				}
				if(args.length == 0){
					msg.reply("Who would you like to block? Blocking needs a command of the form "+prefix+"block <user>.");
					break;
				}

				botMethods.kickUser(msg, args[0], QueueTable);

				let userstrip=args[0].replace(/[\\<>@#&!]/g, "");
		
				if(botMethods.checkBan(userstrip, QueueTable[msg.channel].banlist)==-1){
					QueueTable[msg.channel].banlist.push(userstrip);
					msg.reply(args[0]+" has been blocked. Remember to .save to keep your blocks.");
				}

				break;

			case 'unblock':
			case 'unban': // Unbans a user
				if(!botMethods.hasQueue(msg, QueueTable)){
					msg.reply("No active Queue.");
					break;
				}
				if(!botMethods.isOwner(msg, QueueTable)){
					msg.reply("Invalid Permissions.");
					break;
				}
				if(args.length == 0){
					msg.reply("Who would you like to unblock? Unblocking needs a command of the form "+prefix+"unblock <user>.");
					break;
				}

				let xy=botMethods.checkBan(args[0].replace(/[\\<>@#&!]/g, ""), QueueTable[msg.channel].banlist);

				if(xy!=-1){
					QueueTable[msg.channel].banlist.splice(xy,1);
					msg.reply(args[0]+" has been unblocked. Remember to .save to keep your blocks.");
				}
				else
					msg.reply(args[0]+" was not blocked.");

				break;
				
			case 'viewblocks':
			case 'viewbans': // Sends the owner a list of who they have banned
				if(!botMethods.hasQueue(msg, QueueTable)){
					msg.reply("No active Queue.");
					break;
				}
				if(!botMethods.isOwner(msg, QueueTable)){
					msg.reply("Invalid Permissions.");
					break;
				}

				if(QueueTable[msg.channel].banlist.length==-1)
					msg.author.send('You have no blocks.');
				else
					msg.author.send(botMethods.stringifyIDs(QueueTable[msg.channel].banlist));

				break;

	// For use in debugging and testing
	//   case 'crash':
	//	throw 'up';

			case 'configureq': // For use in changing settings
				if(!botMethods.hasQueue(msg, QueueTable)){
					msg.reply("No active Queue.");
					break;
				}
				if(!botMethods.isOwner(msg, QueueTable)){
					msg.reply("Invalid Permissions.");
					break;
				}
				if(args.length == 0){
					msg.reply("What would like to configure? Configuration is of the form "+prefix+"configureQ <mode> <options>. Use \".configureQ help\" for available options.");
					break;
				}

				switch(args[0].toLowerCase()) {
			
					case 'lobbies': // Maximum number of lobbies

						if(args.length == 1 || isNaN(args[1])){
							msg.reply("Configuring the max number of lobbies requires a number to be passed as the option.");
							break;
						}

						QueueTable[msg.channel].maxplayers=args[1]*QueueTable[msg.channel].size;

						msg.reply("The number of lobbies has been set to "+args[1]+".");
						
						break;

					case 'openlobby': // Remove maximum number of lobbies
		
						QueueTable[msg.channel].maxplayers=-1;

						msg.reply("The number of lobbies has been unrestricted.");
						
						break;
	
					case 'current': // Display current config
		
						let replym= "Your current configuraton is:\n"

						replym+=botMethods.stringifyConfig(botMethods.getSettings(QueueTable[msg.channel]), QueueTable, msg);

						msg.reply(replym);

						break;
			
					case 'attempts': // Maximum number of attempts per user

						if(args.length == 1 || isNaN(args[1])){
							msg.reply("Configuring the max number of attempts requires a number to be passed as the option.");
							break;
						}

						QueueTable[msg.channel].maxAttempts=args[1];

						msg.reply("The maximum number of attempts per user has been set to "+args[1]+".");
						
						break;

					case 'openattempt': // Remove maximum number of attempts

						QueueTable[msg.channel].maxAttempts=-1;

						msg.reply("The maximum number of attempts per user has been unrestricted.");
						
						break;

					case 'showusers': // Show who is sent the code

						QueueTable[msg.channel].sendUseList=true;

						msg.reply("You will be sent a list of the joining users.");
						
						break;

					case 'hideusers': // Hide the users that join

						QueueTable[msg.channel].sendUseList=false;

						msg.reply("You will no longer be sent a list of the joining users.");
						
						break;

					case 'hidejoin': // Hide the .join message

						QueueTable[msg.channel].useJoinReact=false;

						msg.reply("Users will recieve acknowledgement of joining by DM.");
						
						break;

					case 'showjoin': // Show the .join message

						QueueTable[msg.channel].useJoinReact=true;

						msg.reply("Users will recieve acknowledgement of joining by react.");
						
						break;


					case 'lobbysize': // Number of people in a lobby

						if(args.length == 1 || isNaN(args[1])){
							msg.reply("Configuring the size of a lobby requires a number to be passed as the option.");
							break;
						}

						if(QueueTable[msg.channel].maxplayers!=-1)
							QueueTable[msg.channel].maxplayers=QueueTable[msg.channel].maxplayers*args[1]/QueueTable[msg.channel].size;

						QueueTable[msg.channel].size=args[1];

						msg.reply("The number of people per lobby has been set to "+args[1]+".");
						
						break;

					case 'help': // Displays the help menu with a list of configurations usable by the average user.
	
						msg.channel.send(definitionsFile.configurehelptext);

						break;
						
					case 'enablecount': // Sends the number of users that joined
						
						if(!botMethods.isMod(msg, definitionsFile.modNames) && !botMethods.hasRole(msg, 'Max Host'))
							break;
						
						QueueTable[msg.channel].sendafter=true;

						msg.reply("You will be sent the number of joining users.");
						
						break;
						
					case 'disablecount': // No longer sends the number of users that joined
						
						if(!botMethods.isMod(msg, definitionsFile.modNames) && !botMethods.hasRole(msg, 'Max Host'))
							break;
						
						QueueTable[msg.channel].sendafter=false;

						msg.reply("You will not be sent the number of joining users.");
						
						break;
	
				} // End configure switch

				break;

        } // End Switch
	} // End if
  }
  catch (err){

	let time="";
		
	try{time=new Date().toGMTString();}
	catch(er){}

	let errmess = time+":\n"+err.stack+"\n\n";

 	fs.appendFile(errorFile, errmess, (erro) => {
 		// If there's a problem writing errors, just silently suffer
	});
	
	console.log(errmess);
	
	try{msg.channel.send("Oh, I don't feel so good.");}
	catch(er){}
  }
});


// Handle graceful shutdown, save current Queues and terminate connections
process.on('SIGINT', () => {
	console.log('Stopping server');
	shutdown=true;
	
	botMethods.saveTable(QueueTable, client).then(_=>{
		client.destroy().then(_=>{
			console.log('Closed sever');
			process.exit(0);
		}).catch(erro=>{throw erro});
	}).catch(eror=>{console.log(eror); process.exit(1);});
});

process.on('SIGTERM', () => {
	console.log('Stopping server');
	shutdown=true;
	
	botMethods.saveTable(QueueTable, client).then(_=>{
		client.destroy().then(_=>{
			console.log('Closed sever');
			process.exit(0);
		}).catch(erro=>{throw erro});
	}).catch(eror=>{console.log(eror); process.exit(1);});
});

// Ensure that the filesystem exists for user preferences
fs.mkdir('./User_Preferences', err => {if (err && err.code != 'EEXIST') throw 'up'});
fs.mkdir('./Point_System', err => {if (err && err.code != 'EEXIST') throw 'up'});

if(useAuthFile)
	client.login(auth.token);
else
	client.login(process.env.BOT_TOKEN);
