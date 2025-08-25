const { Client, GatewayIntentBits, Events } = require('discord.js');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ],
});

const SafeMessage = require('./functions/safety.js');

//// ^^モジュール^^ ////

client.on(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

const TYPING_DELAY = 1000; // 型付けインジケーターの表示時間(ms)

client.on(Events.MessageCreate, (msg) => {
  if (msg.author.bot) { return; }

  if (msg.mentions.users.has(client.user.id)) {
    SafeMessage(msg, ':sob:', 'send', true, TYPING_DELAY);
  }

  if (msg.content === 'ping') {
    SafeMessage(msg, 'pong!', 'reply', false, 0);
  }
});