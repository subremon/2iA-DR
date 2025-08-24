// ExpressとDiscord.jsをインポート
const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');

// Discordクライアントの作成
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Expressアプリケーションの作成
const app = express();
const PORT = process.env.PORT || 3000;

// Discordボットの準備完了時にログを出力
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Expressサーバーのルートエンドポイント
app.get('/', (req, res) => {
  res.send('Discord bot is running and the server is live!');
});

// ボットとサーバーを同時に起動
async function startServer() {
  try {
    // Discordボットにログイン
    await client.login(process.env.DISCORD_TOKEN);
    console.log('Discord bot logged in successfully.');

    // Expressサーバーを起動
    app.listen(PORT, () => {
      console.log(`Express server is listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server or logging in to Discord:', error);
  }
}

// サーバー起動関数を実行
startServer();