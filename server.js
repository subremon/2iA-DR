// Discord.jsとExpressをインポート
require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Events } = require('discord.js');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ],
});

client.on(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

const TYPING_DELAY = 1000; // 型付けインジケーターの表示時間(ms)

/**
 * 安全にメッセージを送信するためのヘルパー関数
 * @param {object} msg - Discordメッセージオブジェクト
 * @param {string} text - 送信するテキスト
 * @param {string} type - 'send', 'reply', 'dm' のいずれか
 * @param {boolean} silent - サイレントメッセージかどうか
 * @param {number} delay - 送信前の遅延時間(ms)
 */
function safeMessage (msg, text, type = 'send', silent = false, delay = 0) { // embeds, components, stickers, files, attachments, tts, silent, nonce, flags を後で追加
  const messageOptions = { content: text, silent };

  // DMの場合
  if (!msg.guild || type === 'dm') {
    return msg.author.send(messageOptions).catch(console.error);
  }

  // ギルド（サーバー）の場合
  const botPermissions = msg.channel.permissionsFor(client.user.id);
  if (!botPermissions.has('SEND_MESSAGES')) {
    return console.log(`Sorry, I cannot send message in ${msg.channel.id}`); // デバッグ用(後で消す)
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

client.on(Events.MessageCreate, (msg) => {
  console.log(msg);
  if (msg.author.bot) { return; }

  if (msg.mentions.users.has(client.user.id)) {
    safeMessage(msg, ':sob:', 'send', true, TYPING_DELAY);
  }

  if (msg.content === 'ping') {
    safeMessage(msg, 'pong!', 'reply', false, 0);
  }
});

// Expressアプリケーションの作成
const app = express();
const PORT = process.env.PORT || 3000;

// Discordボットの準備完了時にログを出力
client.once(Events.ClientReady, c => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

// Expressサーバーのルートエンドポイント
app.get('/', (req, res) => {
  res.send('Discord bot is running and the server is live!');
});

// ボットとサーバーを同時に起動
async function start() {
  try {
    // Expressサーバーを先に起動
    app.listen(PORT, () => {
      console.log(`Express server is listening on port ${PORT}`);
    });
    
    // Discordボットにログイン
    await client.login(process.env.BOT_TOKEN);

  } catch (error) {
    console.error('Error starting server or logging in to Discord:', error);
  }
}

// サーバー起動関数を実行
start();