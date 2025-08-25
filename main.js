const { Events } = require('discord.js');
const SafeMessage = require('./functions/safety.js');

module.exports = function(client) {
  const TYPING_DELAY = 1000;

  client.once(Events.ClientReady, () => {
    console.log(`✅ main.js: Client is ready as ${client.user.tag}`);

    client.on(Events.MessageCreate, (msg) => {
      if (msg.author.bot) return;

      if (msg.mentions.users.has(client.user)) {
        SafeMessage(msg, ':sob:', 'send', true, TYPING_DELAY);
      }

      if (msg.content === 'ping') {
        SafeMessage(msg, 'pong!', 'reply', false, 0);
      }
    });
  });
};
