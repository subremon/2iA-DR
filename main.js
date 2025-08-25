const { Events } = require('discord.js');
const SafeMessage = require('./functions/safety.js');

module.exports = function(client) {
  const TYPING_DELAY = 1000;

  client.on(Events.MessageCreate, (msg) => {
    if (msg.author.bot) return;

    if (msg.mentions.users.has(client.user.id)) {
      SafeMessage(msg, ':sob:', 'send', true, TYPING_DELAY);
    }

    if (msg.content === 'ping') {
      SafeMessage(msg, 'pong!', 'reply', false, 0);
    }
  });
};
