# ChimechoBot

Discord queue bot for hosting max raids in Pokémon SwSh.

## Installation

1. Clone this repo
2. Run `npm install`
3. Create an `auth.json` file containing a `token` field with the bot's token
    - To use the `auth.json` file, `useauthfile` must be `true`
4. Run `node bot.js`


## Commands

### Everyone
- `.help` - Displays a list of commands you can use and what they do. Output varies depending on whether you're the owner of the queue or a participant.

### Raid participants
- `.join` - Join the queue.
- `.leave` - Leave the queue.
- `.numQ` - Find out your current position in the queue.

### Raid host
- `.createQ` - Creates a blank queue. Uses ChimechoBot's default configuration settings.
- `.ring` - Creates a blank queue using your saved configuration settings (if any).
- `.next` - Run this for each new lobby. A code will be randomly generated and then DM'd to you and the next 3 users in the queue.
- `.add` - If there's an open slot in the lobby, use this to send the lobby's code to the next user in the queue.
- `.up` - Tells ChimechoBot to announce that the lobby is up. Can only be used by DMing ChimechoBot.
- `.deleteQ` - Deletes your queue completely. The channel will become available for someone else to create their own queue.
- `.closeQ` - Closes the queue to new joiners. Once all participants in the queue have had their turn, the queue will be deleted.
- `.openQ` - Reopens a closed queue.
- `.viewQ` - DMs you a list of everyone in the queue.
- `.countQ` - Find out how many users there are in the queue. 
- `.boot` - Kick someone out of your queue.
- `.ban` - Block someone from joining your queue. If they've already joined, this will also kick them. 
- `.unban` - Reverse a user's existing ban and allow them to rejoin.
- `.viewBans` - Find out who you've banned.
- `.configureQ` - Allows you to configure a variety of options for your queues. See [Configuration options](#configuration-options) below.
- `.save` - Saves your current configuration settings (as set through .configureQ) and your banlist for future queues.

### Configuration options 

Use: `.configureQ [option]`; for example, `.configureQ hidejoin` or `.configureQ lobbies 10`

- `current` - Displays the current configuration.
- `lobbysize` - Specify how many users from the queue are sent a code at a time.
  - Example: `lobbysize 2` *(2 participants per lobby will be sent the code)*
  - Default: `lobbysize 3`
- `lobbies` - Limits the maximum number of lobbies to the specified number of lobbies. The queue will automatically close once the queue has enough participants to fill that number of lobbies.
  - Example: `lobbies 10` *(the queue will close after the queue has enough participants for 10 lobbies)*
  - Default: `openlobby` *(no maximum)*
- `attempts` - Limits the maximum number of joins per user. 
  - Example: `attempts 3` *(each user will only be allowed to join the queue 3 times)*
  - Default: `openattempt` *(no maximum)*
- `showusers` - The bot will include a list of joining users alongside the current lobby code.
  - Default: `hideusers`
- `hidejoin` - Set this if you'd like the spammy `.join` messages to be automatically removed from the chat.
  - Default: `showjoin`

### DM-able commands

Hosts can use the following commands by DMing ChimechoBot, as long as `.next` has been run in the channel at least once beforehand.

- `.next`
- `.add`
- `.up`
- `.numQ`

Users can also run `.numQ` by DMing ChimechoBot once they've run it in the channel first.

### Other commands
- `.version` - Returns ChimechoBot's current version.
- `.activeQueues` - Returns the number of current queues.
- `.mod` - Moderator specific commands.
- `diagnose` - Sends errorlogfile. Can only be used by DMing ChimechoBot.


## Additional info

Below are some messages you might encounter from ChimechoBot:

- `Unable to alert a player of the code` - Someone was unable to receive a DM from ChimechoBot due to their Discord privacy settings. They'll have to reenable DMs and rejoin the queue.
- `Hold on, I need to reorganize` - The dreaded server reset. Hold off on running commands until you see `There we go. Continue as you were.`
- `Oh, I don't feel so good` - Something bad has happened. Don't worry, ChimechoBot can handle itself, and you can still use it, but please notify Eldaste.
