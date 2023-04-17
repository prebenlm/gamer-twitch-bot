require("dotenv").config();
const axios = require("axios");
const tmi = require("tmi.js");
const _GamerApi = require("./lib/gamerApi");
const _ChatCommands = require("./lib/chatCommands");


// Twitch bot options
const opts = {
  options: { debug: true },
  identity: {
    username: process.env.TWITCH_BOT_USERNAME,
    password: process.env.TWITCH_OAUTH_TOKEN,
  },
  channels: [process.env.TWITCH_CHANNEL],
};

// Create a client with our options
const client = new tmi.client(opts);
const gamerApi = new _GamerApi();
let chatCommands;
//console.log(process.argv);

if (process.argv[2] !== undefined) {
  if (process.argv[2] === "test") {
    chatCommands = new _ChatCommands(null, gamerApi);
    onMessageHandler(process.env.TWITCH_CHANNEL, {mod:true}, process.argv[3]);
    return;
  }
  const queryParams = {};
  if (process.argv[3] !== undefined) {
    const params = new URLSearchParams(process.argv[3]);

    for (const [key, value] of params.entries()) {
      queryParams[key] = value;
    }
  }
  const response = gamerApi.fetch(process.argv[2], queryParams).then((data) => {
    //console.log(data);
  });
  return;
}

chatCommands = new _ChatCommands(client, gamerApi);

// Register our event handlers (defined below)
client.on("message", onMessageHandler);
client.on("connected", onConnectedHandler);

// Connect to Twitch
client
  .connect()
  .catch((error) => console.error("Failed to connect to Twitch chat:", error));

// Called every time a message comes in
function onMessageHandler(channel, context, msg, self) {
  if (self) {
    return;
  } // Ignore messages from the bot

  // Remove whitespace from chat message
  const commandName = msg.trim();
  if (context.mod) {
    // console.log(`${context.username} is a mod`);
  }
  //console.log(context);

  // If the command starts with !, handle it

  if (msg.startsWith("!")) {
    const regexpCommand = /^!([a-zA-Z0-9]+)(?:\W+)?(.*)?/;
    const matchResult = msg.match(regexpCommand);
    const [raw, command, argument] = matchResult ? matchResult : [];
    if (command) {
    chatCommands.handle(channel, command, argument, context);
    }
  }
}

async function getAppAccessToken() {
    try {
      const response = await axios.post(`https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`);
      return response.data.access_token;
    } catch (error) {
      console.error('Error getting app access token:', error);
      return null;
    }
  }

  setInterval(() => {
    getAppAccessToken()
      .then(appAccessToken => {
        return axios.get(`https://api.twitch.tv/helix/streams?user_login=${process.env.TWITCH_CHANNEL}`, {
          headers: {
            'Client-ID': process.env.TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${appAccessToken}`
          }
        });
      })
      .then(response => {
        //console.log(response.data.data[0])
        const stream = response.data.data[0];
        if (stream) {
          //console.log(`Stream is live: ${stream.title}`);
          chatCommands.findNewResults(process.env.TWITCH_CHANNEL);

        } else {
          //console.log('Stream is offline');
        }
        //chatCommands.findNewResults(process.env.TWITCH_CHANNEL);
      })
      .catch(error => {
        console.error('Error fetching channel status:', error);
      });
  }, 45000);
  

// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}
