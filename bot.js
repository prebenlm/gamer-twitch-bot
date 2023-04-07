require('dotenv').config();
const axios = require('axios');
const tmi = require('tmi.js');

async function fetchGamerApiData(endpoint, queryParams = {}) {
  try {
    const url = new URL(endpoint, process.env.GAMER_API_URL);
    for (const [key, value] of Object.entries(queryParams)) {
      url.searchParams.append(key, value);
    }

    const response = await axios.get(url.toString(), {
      headers: {
        'Authorization': `Bearer ${process.env.GAMER_API_TOKEN}`,
        'Accept': 'application/json'
      }
    })

	return response.data;
  } catch (error) {
    console.error('Error fetching data:', error.message);
  }
}

// Twitch bot options
const opts = {
	identity: {
	  username: process.env.TWITCH_BOT_USERNAME,
	  password: process.env.TWITCH_OAUTH_TOKEN
	},
	channels: [
	  process.env.TWITCH_CHANNEL
	]
  };


// Create a client with our options
const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect().catch((error) => console.error('Failed to connect to Twitch chat 1:', error));

// Called every time a message comes in
function onMessageHandler (target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot

  // Remove whitespace from chat message
  const commandName = msg.trim();

  if (commandName === '!kamp') {
      //console.log(`* Unknown command ${commandName}`);
      const endpoint = 'matchup/207478';
      const queryParams = {
      include_maps: 1
    };

    fetchGamerApiData(endpoint, queryParams).then(data => {
		client.say(target, `Kampen mellom ${data.teams[0].name} og ${data.teams[1].name} er i gang!`);
	});

    client.say(target, `Se informasjon om kampen her: ${response.url}`);
  }
  
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}
