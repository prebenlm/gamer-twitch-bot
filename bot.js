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
    onMessageHandler("matriselan", {}, process.argv[3]);
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
    console.log(data);
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
    console.log(`${context.username} is a mod`);
  }

  // If the command starts with !, handle it

  if (msg.startsWith("!")) {
    const regexpCommand = new RegExp(/^!([a-zA-Z0-9]+)(?:\W+)?(.*)?/);
    const [raw, command, argument] = msg.match(regexpCommand);
    chatCommands.handle(channel, command, argument, context);
  }
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}
