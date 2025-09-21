const { Events } = require('discord.js');
const cron = require("node-cron");
const { SafeMessage } = require('./functions/safety.js');
const { basicDice }= require('./functions/dice.js');

module.exports = function(client) {
  const TYPING_DELAY = 1000;

  client.once(Events.ClientReady, () => {
    console.log(`✅ main.js: Client is ready as ${client.user.tag}`);

    client.on(Events.MessageCreate, (msg) => {
      if (msg.author.bot) return;

      if (/(?<!\d)([R])(\d+)/i.test(msg)) {
        SafeMessage(client, msg, basicDice(msg), false, 0);
      }

      if (msg.mentions.users.has(client.user.id)) {
        SafeMessage(client, msg, ':sob:', 'send', true, TYPING_DELAY);
      }

      if (msg.content === 'ping') {
        SafeMessage(client, msg, 'pong!', 'reply', false, 0);
      }
    });
  });
};
