const { Events } = require('discord.js');
const cron = require('node-cron');
const { SafeMessage, GetDiscord } = require('./functions/safety.js');
const { BasicDice }= require('./functions/dice.js');

module.exports = function(client) {
  const TYPING_DELAY = 1000;

  client.once(Events.ClientReady, () => {
    console.log(`✅ main.js: Client is ready as ${client.user.tag}`);

    cron.schedule('0 0 15 * * *', () => {
      GetDiscord(client, '1085114259425472533', '1386427307761074268').send('test');
    }, {
      timezone: 'UTC'
    });

    client.on(Events.MessageCreate, (msg) => {
      if (msg.author.bot) return;

      if (/(?<!\d)([R])(\d+)/i.test(msg.content)) {
        SafeMessage(client, msg, BasicDice(msg.content)[0]);
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
