// Import required libraries
const Discord = require('discord.js');
const botMethods= require('./chimethods.js');

// Import required tables (authentication, blacklist, definition table)
//const auth = require('./auth.json');
const blackfile = require('./blacklist.json');
const definitionsFile = require('./definitions.json');

// Set up client
const client = new Discord.Client();
var channelBlacklist=blackfile.blacklisted;

// Set up the fileEditor for saving settings
const fs = require('fs'); 

// Set up defaults
const prefix='.';

// Set up blank QueueTable. The QueueTable holds the active Queues and all information needed to run them (all settings and the like).
var QueueTable={};

// Set up blank DMTable. The DMTable is used for anything that involves any DM functionallity.
var DMTable={};

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});


client.on('message', msg => {

    // Escape if channel is in the blacklist or it is a message of the bot
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

	switch(cmd) {
		case 'next':
		case '.next': // Call a new group on the Queue that was just sent.
			botMethods.createGroup(msg, QueueTable, DMTable, true);
			break;

		case 'add':
		case '.add': // Add a member to the last group on the Queue that was just sent.
			botMethods.addMember(msg, QueueTable, DMTable, true);
		break;

	} // End Switch

	return;
    }

//testing whitelist only on this branch is this code included
    if (msg.channel.id != 646049007998730290 && msg.channel.id != 668360850750308358)
	return;

    // Check if command for the bot
    if (message.startsWith(prefix)) {

	// Remove command indicatior prefix and split into args and command
        let args = message.substring(prefix.length).split(' ');
        let cmd = args[0];
	args = args.splice(1);

	// Parse Command
	switch(cmd) {

	    case 'createQ': // Creates a Queue in the given channel if one does not exist already

		if(botMethods.hasQueue(msg, QueueTable)){
			msg.reply("This channel has an active Queue.");
			break;
		}
		QueueTable[msg.channel]=botMethods.queueBase(msg);
		msg.reply("Queue created.");

	    break;

	    case 'deleteQ': // Removes the Queue if sent by the Queue owner
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


	    case 'modDelete': // Removes the Queue if sent by the Queue owner
			      // Intended to clear channels left locked by absent owners
		if(!botMethods.hasQueue(msg, QueueTable)){
			msg.reply("No active Queue.");
			break;
		}		
		if(!botMethods.isMod(msg, definitionsFile.modNames)){
			msg.reply("Invalid Permissions.");
			break;
		}

		QueueTable[msg.channel]=undefined;
		msg.reply("Queue cleared.");
	    break;

	    case 'closeQ': // Closes Queue to further joins and deletes the Queue if empty
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


	    case 'openQ': // Reopens Queue to further joins if it exists
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

		if(!QueueTable[msg.channel].dupes && botMethods.isEnqueued(msg, QueueTable))
			msg.reply("You are already Queued");
		else{
			QueueTable[msg.channel].queued.push(msg.author);
			
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

		if(ispastfil && !botMethods.isFilled(msg, QueueTable))
			msg.channel.send("A spot has opened! Join while you can.");
		
		if(!QueueTable[msg.channel].open)
			botMethods.clearIfEmpty(msg, QueueTable, msg.channel);
	    break;

	    case 'viewQ': // Sends Queue owner a list of evryone in the Queue 
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

	    case 'activeQueues': // For use in identifying when matinenece is safe
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

		if(botMethods.saveSettings(msg.author, botMethods.getSettings(QueueTable[msg.channel]), fs))
			msg.reply("I think I've got all that. I'll have everything ready for you next time you ring.");

	    break;

	    case 'ring': // Creates a Queue in the given channel if one does not exist already with the User's saved settings if possible.

		if(botMethods.hasQueue(msg, QueueTable)){
			msg.reply("This channel has an active Queue.");
			break;
		}

		QueueTable[msg.channel]=botMethods.queueBase(msg);

		let changed=botMethods.setSettings(QueueTable[msg.channel], botMethods.readSettings(msg.author,fs));
		let replyms="";

		if(changed.maxplayers!=undefined) replyms+=(changed.maxplayers/QueueTable[msg.channel].size)+" rooms. ";
		if(changed.size!=undefined) replyms+=changed.size+" to a room. ";
		if(changed.dupes!=undefined){
			if(changed.dupes)
				replyms+="With duplicates allowed. ";
			else
				replyms+="With no duplicates allowed. ";
		}

		if(replyms=="")
			replyms="Ring-a-Ding! "+msg.author+", your queue has been created!";
		else
			replyms="Ring-a-Ding! "+msg.author+", your queue has been created just how you like it! "+replyms;

		msg.channel.send(replyms);

	    break;

	    case 'help': // Displays the help menu with a list of commands usable by the average user.

		msg.channel.send(definitionsFile.helptext);

	    break;

	    case 'configureQ': // For use in changing settings
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

		switch(args[0]) {
			
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
	
		} // End configure switch

	    break;

         } // End Switch
     }
});

// Ensure that the filesystem exists for user preferences
fs.mkdir('./User_Preferences', err => {if (err && err.code != 'EEXIST') throw 'up'});

client.login(process.env.BOT_TOKEN)
