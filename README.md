Raid queue bot for organizing Pokemon Max raids with Discord servers.

Commands:

.createQ - makes a Queue on the channel, needed to do anything else.

.deleteQ - Deletes the Queue in its entirety and frees the bot to make a new Queue on that channel.

.closeQ - Disallows more users from joining. Deletes Queue when all users have been sent a code.

.modDelete - Forces delete of any Queue regardless of Queue owner. Useable only by those with a role in the modwords of the definitions file. 

.openQ - Reopens Queue after a .closeQ before all users have emptied.

.join - Enqueues a user if they aren't in the queue already.

.viewQ - Sends the Queue owner (the one that created it) a list of who is in the queue.

.next - Sends the owner and the next 3 people in the Queue (random) codes to connect with. Usable from DM after the first .next.

.add - Sends the next in Queue the same code as the last group. Command usable from DM.

.leave - Removes self from the Queue.

.activeQueues - For use by the one running the bot itself to ID the number of giveaways (to find safe times for matinance).

.configureQ - Configure various options about the Queue. Requires arguments.
   - lobbysize <number> - Changes number of people per lobby.
   - lobbies <number> - Set a max number of lobbies. Automatically closes queue when last lobby is filled and clears queue when last lobby is called via next.
   - openlobby - Removes the max lobby restriction set by lobbies.

.save - Saves the current configuration on a per user basis.

.ring - Opens a new Queue using the user's saved settings if available

.help - Displays a list of commands. Not all commands are listed. Mod only commands and commands for server matinence are not shown. Sensitive to if a Queue is up.

.up - DIsplays a message on the channel that the room is up. Usable only via DM.


Bot can be tried out here https://discord.gg/44j5GBg

Scaleable to a server without a set numeber of channels.
Blacklist for individual channels exists.

Requires a 'auth.json' file containing a 'token' field that contains the bot's token.

To use: 

Download the files
Run an 'npm install' 
Create the auth.json file
Run 'node bot.js'


Upcoming: 

Ability to track how many unique users join a given raid Queue

Ability for Mods to lock certian option configurations on a per-server basis

Configuration options:
  - Max number of attempts
  - Allow users to add themselevs multiple times in a single Queue
  - Unique user tracking on/off 
