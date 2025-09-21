const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

/**
 * 埋め込み（Embed）を生成する関数
 * @param {object} options - 埋め込みのオプション
 * @param {string} options.title - タイトル
 * @param {string} options.description - 説明文
 * @param {import('discord.js').HexColorString} [options.color="#000000"] - 埋め込みの左側の色
 * @param {object} [options.author] - 埋め込みの作者情報 { name: <Str>, iconURL: <Str>, url: <Str> }
 * @param {object} [options.footer] - 埋め込みのフッター { text: <Str>, iconURL: <Str> }
 * @param {Date} [options.timestamp=new Date()] - 埋め込みの作成日時
 * @param {string} [options.url] - タイトルのURL
 * @param {string} [options.thumbnail] - サムネイル画像のURL
 * @param {string} [options.image] - 添付画像のURL
 * @param {array} [options.fields] - 追加するフィールド [{ name: <Str>, value: <Int>, inline: <Bool> }...]
 * @returns {EmbedBuilder} - DiscordのEmbedBuilderオブジェクト
 */
function CreateEmbed(options) {
  const {
    title,
    description,
    color = "#000000",
    author,
    footer,
    timestamp,
    url,
    thumbnail,
    image,
    fields
  } = options;

  const embed = new EmbedBuilder();

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (color) embed.setColor(color);
  if (author) embed.setAuthor(author);
  if (footer) embed.setFooter(footer);
  if (timestamp) embed.setTimestamp(timestamp);
  if (url) embed.setURL(url);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);
  if (fields) embed.addFields(fields);
  
  return embed;
}

// 使い方:
// 必要なオプションだけを指定して呼び出す
const myEmbed = CreateEmbed({
  title: '新しい埋め込み',
  description: 'これはテストです。',
  color: '#FF0000'
});

// すべてのオプションを指定
const anotherEmbed = CreateEmbed({
  title: 'タイトル',
  description: '説明',
  color: '#00FF00',
  author: { name: '作者', iconURL: '...' },
  fields: [{ name: 'フィールド', value: '値' }]
});

// コンポーネント（Components）を生成する関数
function CreateComponents() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('primary')
      .setLabel('クリックしてください')
      .setStyle(ButtonStyle.Primary)
  );
  return row;
}

/**
 * 安全にメッセージを送信するためのヘルパー関数
 * @param {import('discord.js').Client} client - DiscordClientインスタンス
 * @param {import('discord.js').Message} msg - Discordメッセージオブジェクト
 * @param {string} text - 送信するテキスト
 * @param {string} type - 'send', 'reply' のいずれか
 * @param {boolean} silent - サイレントメッセージかどうか
 * @param {number} delay - 送信前の遅延時間(ms)
 * @returns {Promise<import('discord.js').Message>|void} - 送信されたメッセージのPromise、またはvoid
 */
async function SafeMessage(client, msg, text, type = 'send', silent = false, delay = 0) {
// embeds, components, stickers, files, attachments, tts, silent, nonce, flags を後で追加
  try {
    const messageOptions = {
        content: text,
        flags: silent ? MessageFlags.SuppressNotifications : 0
    };

    // DMの場合
    if (type === 'dm' || !msg.guild) {
        return await msg.author.send(messageOptions);
    }

    // ギルド（サーバー）の場合
    const botPermissions = msg.channel.permissionsFor(client.user.id);

    if (!botPermissions || !botPermissions.has('SendMessages')) {
        console.error(`❌ Botはこのチャンネルでメッセージを送信できません: ${msg.channel.name}`);
        return await msg.author.send({
            content: `${msg.guild.name}の${msg.channel}でメッセージに対応しようとしましたが、失敗しました。\nそのチャンネルでBOTがメッセージを送信可能か確認してください。`
        });
    }
    
    if (delay > 0) {
        await msg.channel.sendTyping();
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    if (type === 'send') {
        return await msg.channel.send(messageOptions);
    } else if (type === 'reply') {
        return await msg.reply(messageOptions);
    }

  } catch (err) {
    console.error('メッセージ送信中に予期せぬエラーが発生しました:', err);
    throw err;
  }
}

module.exports = { CreateEmbed, SafeMessage };