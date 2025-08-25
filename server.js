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
  const bankDBClient = new PGClient({
    user: process.env.BANK_DB_USER,
    host: process.env.BANK_DB_HOST,
    database: process.env.BANK_DB_NAME,
    password: process.env.BANK_DB_PASSWORD,
    port: process.env.BANK_DB_PORT,
  });

  /* const settingsDBClient = new PGClient({
    user: process.env.SETTING_DB_USER,
    host: process.env.SETTING_DB_HOST,
    database: process.env.SETTING_DB_NAME,
    password: process.env.SETTING_DB_PASSWORD,
    port: process.env.SETTING_DB_PORT,
  }); */

  try {
    await bankDBClient.connect();
    console.log('✅ Bankデータベースに接続しました。');

    /* await settingsDBClient.connect();
    console.log('✅ Settingsデータベースに接続しました。'); */

    return { bankDBClient, settingsDBClient };
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
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    await rest.put(
      Routes.applicationCommands(c.user.id),
      { body: commands }
    );
    console.log(`[INFO] コマンドを正常に登録しました。`);
  } catch (error) {
    console.error(error);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, dbClients);
  } catch (error) {
    console.error('❌ コマンド実行エラー:', error);
    await interaction.reply({ content: 'コマンド実行中にエラーが発生しました。', ephemeral: true });
  }
});

// Expressルート
app.get('/', (req, res) => {
  res.send('Discord bot is running and the server is live!');
});

// main.js を呼び出し
require('./main')(client);

// 起動処理
let dbClients;

async function initialize() {
  try {
    dbClients = await connectToDatabases();

    app.listen(PORT, () => {
      console.log(`🚀 Express server is listening on port ${PORT}`);
    });

    await client.login(process.env.BOT_TOKEN);
  } catch (error) {
    console.error('❌ 起動エラー:', error);
  }
}

initialize();