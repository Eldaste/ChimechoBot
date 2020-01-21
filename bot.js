const Discord = require('discord.js');
const client = new Discord.Client();
const auth = require('./auth.json');
const blackfile = require('./blacklist.json');
const modNameFile = require('./definitions.json');
const prefix='.'
const defaultNum=3;
const defaultDuplication=false;


var QueueTable={};
var channelBlacklist=blackfile.blacklisted;
var modRoles=modNameFile.modNames;

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});


client.on('message', msg => {

    if (channelBlacklist.indexOf(msg.channel.id) != -1)
	return;

    var message=msg.content;

    if (message.startsWith(prefix)) {
        var args = message.substring(prefix.length).split(' ');
        var cmd = args[0];


	args = args.splice(1);


	//console.log("Command "+cmd)
        //console.log("Args "+args)

	switch(cmd) {

	    case 'createQ':
		if(QueueTable[msg.channel]!=undefined){
			msg.reply("This channel has an active Queue.");
			break;
		}
		QueueTable[msg.channel]={queued:[], owner:msg.author, size:defaultNum, dupes:defaultDuplication, open:true}
		msg.reply("Queue created.");

	    break;

	    case 'deleteQ':
		if(QueueTable[msg.channel]==undefined){
			msg.reply("No active Queue.");
			break;
		}
		if(QueueTable[msg.channel].owner!=msg.author){
			msg.reply("Invalid Permissions.");
			break;
		}
		QueueTable[msg.channel]=undefined;
		msg.reply("Queue cleared.");
	    break;


	    case 'modDelete':
		if(QueueTable[msg.channel]==undefined){
			msg.reply("No active Queue.");
			break;
		}
		var roleList = msg.guild.roles.array();
		var allowedRole=undefined;
		
		for(x in roleList){
			if(modRoles.indexOf(roleList[x].name)!=-1){
				allowedRole=roleList[x];
				break;
			}
		}
		
		if(undefined==allowedRole||!msg.member.roles.has(allowedRole.id)){
			msg.reply("Invalid Permissions.");
			break;
		}
		QueueTable[msg.channel]=undefined;
		msg.reply("Queue cleared.");
	    break;

	    case 'closeQ':
		if(QueueTable[msg.channel]==undefined){
			msg.reply("No active Queue.");
			break;
		}
		if(QueueTable[msg.channel].owner!=msg.author){
			msg.reply("Invalid Permissions.");
			break;
		}
		QueueTable[msg.channel].open=false;
		msg.channel.send("Queue closed, no further joins allowed.");
		if(0==QueueTable[msg.channel].queued.length){
			msg.author.send("Queue cleared.");
			msg.channel.send("Queue cleared.");
			QueueTable[msg.channel]=undefined;
		}
	    break;


	    case 'openQ':
		if(QueueTable[msg.channel]==undefined){
			msg.reply("No active Queue.");
			break;
		}
		if(QueueTable[msg.channel].owner!=msg.author){
			msg.reply("Invalid Permissions.");
			break;
		}
		QueueTable[msg.channel].open=true;
		msg.channel.send("Queue reopened, joins allowed.");
	    break;


	    case 'join':
		if(QueueTable[msg.channel]==undefined){
			msg.reply("No active Queue.");
			break;
		}
		if(!QueueTable[msg.channel].open){
			msg.reply("Queue closed.");
			break;
		}
		var joinable=true;

		if(!QueueTable[msg.channel].dupes)
			for(x of QueueTable[msg.channel].queued)
				if(x==msg.author){
					msg.reply("You are already Queued");
					joinable=false;
				}

		if(joinable) QueueTable[msg.channel].queued.push(msg.author);
	    break;

	    case 'leave':
		if(QueueTable[msg.channel]==undefined){
			msg.reply("No active Queue.");
			break;
		}
		found=false;

		if(!QueueTable[msg.channel].dupes)
			for(x=0;x<QueueTable[msg.channel].queued.length && !found;x++)
				if(QueueTable[msg.channel].queued[x]==msg.author){
					QueueTable[msg.channel].queued.splice(x,1);
					msg.reply("You have been removed.");
					found=true;
				}
		if(!QueueTable[msg.channel].open&&0==QueueTable[msg.channel].queued.length){
			msg.author.send("Queue cleared.");
			msg.channel.send("Queue cleared.");
			QueueTable[msg.channel]=undefined;
		}
	    break;

	    case 'viewQ':
		if(QueueTable[msg.channel]==undefined){
			msg.reply("No active Queue.");
			break;
		}
		if(QueueTable[msg.channel].owner!=msg.author){
			msg.reply("Invalid Permissions.");
			break;
		}
		if(QueueTable[msg.channel].queued.length==0){
			msg.author.send("Queue is empty.");
			break;
		}
		msg.author.send(QueueTable[msg.channel].queued);
	    break;

	    case 'activeQueues':
		var num=0;

		for(x in QueueTable)
			if(QueueTable[x]!=undefined)
				num++;

		console.log(num);
	    break;

	    case 'next':
		if(QueueTable[msg.channel]==undefined){
			msg.reply("No active Queue.");
			break;
		}
		if(QueueTable[msg.channel].owner!=msg.author){
			msg.reply("Invalid Permissions.");
			break;
		}
		if(QueueTable[msg.channel].queued.length==0){
			msg.reply("Queue is empty.");
			break;
		}
		var coderaw=Math.floor(Math.random() * 10000);
		var total=0;

		var code=""+coderaw;

		if(coderaw<1) code="0"+code;
		if(coderaw<10) code="0"+code;
		if(coderaw<100) code="0"+code;
		if(coderaw<1000) code="0"+code;


		for(var i=0;i<QueueTable[msg.channel].size;i++){
			var user=QueueTable[msg.channel].queued.shift();
			total+=1;
			if(QueueTable[msg.channel].queued.length==0){
				i=QueueTable[msg.channel].size;
			}
			user.send("Your join code is "+code+".")
		}

		if(total == 1) msg.author.send("The code is "+code+". "+total+" user is joining.");
		else msg.author.send("The code is "+code+". "+total+" users are joining.");
		if(!QueueTable[msg.channel].open&&total<QueueTable[msg.channel].size){
			msg.author.send("Queue cleared.");
			msg.channel.send("Queue cleared.");
			QueueTable[msg.channel]=undefined;
		}
	    break;
         }
     }
});


client.login(auth.token);
