Proof of concept for a raid queue bot.

Commands:

.createQ - makes a Queue on the channel, needed to do anything else.

.deleteQ - Deletes the Queue in its entirety and frees the bot to make a new Queue on that channel.

.closeQ - Disallows more users from joining. Deletes Queue when all users have been sent a code.

.modDelete - Forces delete of any Queue regardless of Queue owner. Useable only by those with the role "Mod" or "Mods" 

.openQ - Reopens Queue after a .closeQ before all users have emptied.

.join - Enqueues a user if they aren't in the queue already.

.viewQ - Sends the Queue owner (the one that created it) a list of who is in the queue.

.next - Sends the owner and the next 3 people in the Queue (random) codes to connect with.

.leave - Removes self from the Queue.

.activeQueues - For use by the one running the bot itself to ID the number of giveaways.



Bot can be tried out here https://discord.gg/44j5GBg

Scaleable to a server without a set numebr of channels.



Upcoming: 

Configuration options:
  - Max number of attempts
  - Allow users to add themselevs multiple times in a single Queue
  - Change Room size
