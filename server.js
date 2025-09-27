require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, REST, Routes, GatewayIntentBits, Events, Collection } = require('discord.js');
const { Client: PGClient } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ],
});

client.commands = new Collection();

async function connectToDatabases() {
  // 修正箇所: 接続URIを格納する環境変数（例: DATABASE_URL）を使用
  const connectionString = process.env.DATABASE_URL; 
  
  if (!connectionString) {
      console.error('❌ 環境変数 DATABASE_URL が設定されていません。');
      throw new Error('DATABASE_URL is not set.');
  }

  // PGClientに接続URI文字列を直接渡す
  const dbClient = new PGClient({
    connectionString: connectionString, // または new PGClient(connectionString)
    // Supabaseに接続する場合、Renderのようなクラウド環境から接続する際はSSL接続が必須となることが多いです
    ssl: {
      rejectUnauthorized: false // Herokuや一部のクラウドホスティングで必要になる設定（セキュリティ上の注意が必要）
    }
  });

  try {
    await dbClient.connect();
    console.log('✅ Bankデータベースに接続しました。');

    return dbClient;
  } catch (err) {
    console.error('❌ データベース接続エラー:', err);
    throw err;
  }
}

// コマンド登録
const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
  } else {
    console.log(`[WARNING] ${filePath} には 'data' または 'execute' プロパティがありません。`);
  }
}

// イベント登録
client.once(Events.ClientReady, async c => {
  console.log(`✅ Ready! Logged in as ${c.user.tag}`);

  try {
    const rest = new REST().setToken(process.env.BOT_TOKEN);
    await rest.put(
      Routes.applicationCommands(c.user.id),
      { body: commands }
    );
    console.log(`[INFO] コマンドを正常に登録しました。`);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, dbClient);
  } catch (error) {
    console.error('❌ コマンド実行エラー:', error);
    throw error;
  }
});

// Expressルート
app.get('/', (req, res) => {
  res.send('Discord bot is running and the server is live!');
});

// main.js を呼び出し
require('./main')(client);

// 起動処理
let dbClient;

async function initialize() {
  try {
    dbClient = await connectToDatabases();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Express server is listening on port ${PORT} on host 0.0.0.0`);
    });

    await client.login(process.env.BOT_TOKEN);
  } catch (error) {
    console.error('❌ 起動エラー:', error);
  }
}

initialize();