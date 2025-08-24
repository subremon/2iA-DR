// Discord.jsとExpressをインポート
require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Events } = require('discord.js');

// Discordクライアントの作成
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ここにmain.jsを読み込む
require('./main.js'); 

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