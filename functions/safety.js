const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

/**
 * 埋め込み（Embed）を生成する関数
 * @param {object} options - 埋め込みのオプション
 * @param {string} options.title - タイトル
 * @param {string} options.description - 説明文
 * @param {import('discord.js').HexColorString} [options.color='#000000'] - 埋め込みの左側の色
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
    color = '#000000',
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
 * チャンネルを取得するためのヘルパー関数
 * @param {import('discord.js').Client} client - DiscordClientインスタンス
 * @param {string} guildId - サーバーID
 * @param {string} channelId - チャンネルID
 * @returns {Promise<import('discord.js').Channel>} - チャンネルオブジェクト
 */
async function GetDiscord(client, guildId, channelId = null) {
  try {
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      throw new Error('指定されたサーバーが見つかりません。');
    }

    if (channelId) {
      const channel = await guild.channels.fetch(channelId);
      if (!channel) {
        throw new Error('指定されたチャンネルが見つかりません。');
      }
      return channel;
    }

    return guild; // ギルドIDのみが指定された場合はギルドを返す

  } catch (err) {
    console.error('getDiscordエラー:', err.message);
    throw err;
  }
}

/**
 * 安全にメッセージを送信するためのヘルパー関数
 * @param {import('discord.js').Client} client - DiscordClientインスタンス
 * @param {import('discord.js').Message} msg - Discordメッセージオブジェクト
 * @param {string|object} contentOrOptions - 送信するテキスト or MessageOptionsオブジェクト
 * @param {string} type - 'send', 'reply', 'dm' のいずれか
 * @param {boolean} silent - サイレントメッセージかどうか
 * @param {number} delay - 送信前の遅延時間(ms)
 * @returns {Promise<import('discord.js').Message>|void}
 */
async function SafeMessage(client, msg, contentOrOptions, type = 'send', silent = false, delay = 0) {
  try {
    // メッセージオプションの組み立て
    let messageOptions = {};

    if (typeof contentOrOptions === "string") {
      // stringの場合 → contentとして扱う
      messageOptions.content = contentOrOptions;
    } else if (typeof contentOrOptions === "object" && contentOrOptions !== null) {
      // objectの場合 →そのまま展開
      messageOptions = { ...contentOrOptions };
    }

    // silentオプション反映
    messageOptions.flags = silent ? MessageFlags.SuppressNotifications : messageOptions.flags ?? 0;

    // DMの場合
    if (type === 'dm' || !msg.guild) {
      return await msg.author.send(messageOptions);
    }

    // ギルド（サーバー）の場合
    const botPermissions = msg.channel.permissionsFor(client.user.id);
    if (!botPermissions || !botPermissions.has('SendMessages')) {
      console.error(`❌ Botはこのチャンネルでメッセージを送信できません: ${msg.channel.name}`);
      return await msg.author.send({
        content: `${msg.guild.name} の ${msg.channel} でメッセージに対応しようとしましたが失敗しました。\nそのチャンネルでBOTがメッセージを送信可能か確認してください。`
      });
    }

    // 遅延処理
    if (delay > 0) {
      await msg.channel.sendTyping();
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // 送信モード
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

module.exports = { CreateEmbed, GetDiscord, SafeMessage };