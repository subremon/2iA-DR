/**
 * 安全にメッセージを送信するためのヘルパー関数
 * @param {client} client - DiscordClientインスタンス
 * @param {object} msg - Discordメッセージオブジェクト
 * @param {string} text - 送信するテキスト
 * @param {string} type - 'send', 'reply', 'dm' のいずれか
 * @param {boolean} silent - サイレントメッセージかどうか
 * @param {number} delay - 送信前の遅延時間(ms)
 * @returns {Function} - SafeMessage関数
 */
function SafeMessage (client, msg, text, type = 'send', silent = false, delay = 0) { // embeds, components, stickers, files, attachments, tts, silent, nonce, flags を後で追加
  const messageOptions = { content: text, silent };

  // DMの場合
  if (!msg.guild || type === 'dm') {
    return msg.author.send(messageOptions).catch(console.error);
  }

  // ギルド（サーバー）の場合
  const botPermissions = msg.channel.permissionsFor(msg.client.user?.id);

  if (!botPermissions || !botPermissions.has('SendMessages')) {
    console.log(`❌ Botはこのチャンネルでメッセージを送信できません: ${msg.channel.name}`);
    return;
  }
  
  // 待機処理
  if (delay > 0) {
    msg.channel.sendTyping();
  }

  // サーバーメッセージ送信
  setTimeout(() => { 
    if (type === 'send') {
      msg.channel.send(messageOptions);
    } else if (type === 'reply') {
      msg.reply(messageOptions); 
    }
  }, delay);
}

module.exports = SafeMessage;