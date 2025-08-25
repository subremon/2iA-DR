// Discord.jsとExpressをインポート
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, REST, Routes, GatewayIntentBits, Events } = require('discord.js');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ],
});

const { Client: PGClient } = require('pg');

async function connectToDatabases() {
  const bankDBClient = new PGClient({
    user: process.env.BANK_DB_USER,
    host: process.env.BANK_DB_HOST,
    database: process.env.BANK_DB_NAME,
    password: process.env.BANK_DB_PASSWORD,
    port: process.env.BANK_DB_PORT,
  });

  const settingsDBClient = new PGClient({
    user: process.env.SETTING_DB_USER,
    host: process.env.SETTING_DB_HOST,
    database: process.env.SETTING_DB_NAME,
    password: process.env.SETTING_DB_PASSWORD,
    port: process.env.SETTING_DB_PORT,
  });

  try {
    await bankDBClient.connect();
    console.log('Bankデータベースに接続しました。');

    await settingsDBClient.connect();
    console.log('Settingsデータベースに接続しました。');

    return { bankDBClient, settingsDBClient };
  } catch (err) {
    console.error('データベース接続エラー:', err);
    throw err;
  }
}

// server.jsのinteractionCreateイベント内
client.on('interactionCreate', async interaction => {
  // ...
  try {
    const clients = await connectToDatabases(); // 接続はBOT起動時に行う
    const command = client.commands.get(interaction.commandName);
    if (command) {
      await command.execute(interaction, clients); // 複数のクライアントを渡す
    }
  } catch (error) {
    // ...
  }
});

const commands = [];
// コマンドファイルが存在するディレクトリのパスを指定
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
    } else {
        console.log(`[WARNING] ${filePath} には 'data' または 'execute' プロパティがありません。`);
    }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`[INFO] ${commands.length} 個のアプリケーションコマンドを登録します。`);

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log(`[INFO] コマンドを正常に登録しました。`);
    } catch (error) {
        console.error(error);
    }
})();

require('main.js');

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