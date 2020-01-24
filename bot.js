// Import required libraries
const Discord = require('discord.js');
const botMethods= require('./togemethods.js');

// Import required tables (authentication, blacklist, definition table)
const auth = require('./auth.json');
const blackfile = require('./blacklist.json');
const definitionsFile = require('./definitions.json');

// Set up client
const client = new Discord.Client();
var channelBlacklist=blackfile.blacklisted;

// Set up defaults
const prefix='.'

// Set up blank QueueTable
var QueueTable={};

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});


client.on('message', msg => {

    // Escape if channel is in the blacklist or it is a message of the bot
    if (channelBlacklist.indexOf(msg.channel.id) != -1 || msg.author == client.user)
	return;

    // Extract content for easier manipulation
    let message=msg.content;

    // Check if command for the bot
    if (message.startsWith(prefix)) {

	// Remove command indicatior prefix and split into args and command
        var args = message.substring(prefix.length).split(' ');
        var cmd = args[0];
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

		botMethods.clearIfEmpty(msg, QueueTable);
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

		if(!QueueTable[msg.channel].dupes && botMethods.isEnqueued(msg, QueueTable))
			msg.reply("You are already Queued");
		else
			QueueTable[msg.channel].queued.push(msg.author);
	    break;

	    case 'leave': // Leaves the Queue. Only removes first instance of the user
		if(!botMethods.hasQueue(msg, QueueTable)){
			msg.reply("No active Queue.");
			break;
		}

		let x=botMethods.findUser(msg, QueueTable);

		if(x!=-1){
			QueueTable[msg.channel].queued.splice(x,1);
			msg.reply("You have been removed.");
		}
		
		if(!QueueTable[msg.channel].open)
			botMethods.clearIfEmpty(msg, QueueTable);
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
		var num=0;

		for(x in QueueTable)
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
		if(QueueTable[msg.channel].queued.length==0){
			msg.reply("Queue is empty.");
			break;
		}
		
		let total=0;
		let code=botMethods.randomCode();

		for(var i=0;i<QueueTable[msg.channel].size;i++){
			// Get a user 
			let user=QueueTable[msg.channel].queued.shift();
			total++;

			// If no users remain in the Queue, force a loop break
			if(QueueTable[msg.channel].queued.length==0){
				i=QueueTable[msg.channel].size;
			}

			user.send("Your join code is "+code+".")
		}

		// Alert Queue owner to the code and how many to expect
		if(total == 1) msg.author.send("The code is "+code+". "+total+" user is joining.");
		else msg.author.send("The code is "+code+". "+total+" users are joining.");

		if(!QueueTable[msg.channel].open)
			botMethods.clearIfEmpty(msg, QueueTable);
	    break;
         } // End Switch
     }
});


client.login(auth.token);
