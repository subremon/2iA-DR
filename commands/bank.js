const { SlashCommandBuilder, PermissionFlagsBits, Locale } = require('discord.js');
const { MoneyPay, MoneyHave, SetMoney, SetCurrency, SetInitial, SetLogChannel, LogModule } = require('../functions/moneyger.js');

module.exports = {
  // スラッシュコマンドの定義
  data: new SlashCommandBuilder()
    .setName('bank')
    .setDescription('Manage bank')
    .setNameLocalization(Locale.Japanese, 'bank')
    .setDescriptionLocalization(Locale.Japanese, 'ポイントの拡張コマンド。')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    // setting
    .addSubcommand(subcommand =>
      subcommand
        .setName('setting')
        .setDescription('.')
        .setDescriptionLocalization(Locale.Japanese, 'ポイントの各種設定をします。')
        .addStringOption(option =>
          option.setName('currency_name')
            .setDescription('.')
            .setDescriptionLocalization(Locale.Japanese, 'このサーバーで使用する通貨の名前')
            .setMaxLength(64)
            .setRequired(false))
        .addIntegerOption(option =>
          option.setName('initial_points')
            .setDescription('.')
            .setDescriptionLocalization(Locale.Japanese, 'このサーバーで使用する初期ポイント')
            .setMinValue(0)
            .setMaxValue(90072)
            .setRequired(false))
        .addChannelOption(option =>
          option.setName('log_channel_locate')
            .setDescription('.')
            .setDescriptionLocalization(Locale.Japanese, 'このサーバーの取引ログを残すチャンネル')
            .setRequired(false)))
    // pay
    .addSubcommand(subcommand =>
      subcommand
        .setName('fluctuate')
        .setDescription('.')
        .setDescriptionLocalization(Locale.Japanese, 'ポイントを増減します。')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('.')
            .setDescriptionLocalization(Locale.Japanese, '操作するユーザー')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('point')
            .setDescription('.')
            .setDescriptionLocalization(Locale.Japanese, '操作するポイントの量')
            .setMinValue(-90072)
            .setMaxValue(90072)
            .setRequired(true)))
    // have
    .addSubcommand(subcommand =>
      subcommand
        .setName('budget')
        .setDescription('Have points')
        .setDescriptionLocalization(Locale.Japanese, 'サーバーの所持ポイントを確認します。'))
    // set
    .addSubcommand(subcommand =>
      subcommand
        .setName('replace')
        .setDescription('.')
        .setDescriptionLocalization(Locale.Japanese, 'ユーザーのポイントを置き替えます。')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('.')
            .setDescriptionLocalization(Locale.Japanese, '置き換えるユーザー')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('point')
            .setDescription('.')
            .setDescriptionLocalization(Locale.Japanese, '置き換えるポイントの量')
            .setMinValue(-90072)
            .setMaxValue(90072)
            .setRequired(true))),

  async execute(interaction, dbClient) {
    const subcommand = await LogModule(dbClient, interaction)[1];
    
    if (subcommand === 'setting') {
      // レスポンスメッセージを格納する配列
      const responses = [];

      // 通貨の設定
      if (interaction.options.get("currency_name")) {
        const result = await SetCurrency(dbClient, interaction);
        if (result[0] === 'success') {
          const new_currency = result[1];
          responses.push(`通貨の名前を${new_currency}に変更しました。`);
        } else { // 'fail' と 'error' をまとめて処理
          await interaction.reply({
            content: result[1],
            ephemeral: true
          });
          return; // エラーが発生したらここで処理を終了
        }
      }

      // 初期金の設定
      if (interaction.options.get("initial_points")) {
        const result2 = await SetInitial(dbClient, interaction);
        if (result2[0] === 'success') {
          const new_initial_points = result2[1];
          responses.push(`初期ポイントを${new_initial_points}に変更しました。`);
        } else { // 'fail' と 'error' をまとめて処理
          await interaction.reply({
            content: result2[1],
            ephemeral: true
          });
          return; // エラーが発生したらここで処理を終了
        }
      }

      // 初期金の設定
      if (interaction.options.get("log_channel_locate")) {
        const result2 = await SetInitial(dbClient, interaction);
        if (result2[0] === 'success') {
          const log_channel = result2[1];
          responses.push(`ログの出力を${log_channel}に行います。`);
        } else { // 'fail' と 'error' をまとめて処理
          await interaction.reply({
            content: result2[1],
            ephemeral: true
          });
          return; // エラーが発生したらここで処理を終了
        }
      }

      // レスポンス配列が空でない場合のみ、メッセージを送信
      if (responses.length > 0) {
        await interaction.reply({
          content: responses.join('\n'), // 配列を改行で結合して表示
          ephemeral: true // エラーメッセージ以外は一時的なメッセージとするのが一般的
        });
      } else {
        // どちらのオプションも指定されなかった場合
        await interaction.reply({
          content: '設定する項目を選択してください。',
          ephemeral: true
        });
      }
    } if (subcommand === 'fluctuate') {
      const result = await MoneyPay(dbClient, interaction, null, null, 'bank', null, true);

      if (result[0] === 'success') {
        const takerId = result[2];
        const point = result[3];
        const unit = result[4];
        const content = point > 0 ? `${interaction.guild.name}から<@${takerId}>に${point}${unit}送りました。` : `${interaction.guild.name}が<@${takerId}>から${-point}${unit}を徴収しました。`;
        await interaction.reply({
          content
        });
      } else if (result[0] === 'fail') {
        await interaction.reply({
          content: result[1],
          ephemeral: true
        });
      } else if (result[0] === 'error') {
        await interaction.reply({
          content: result[1],
          ephemeral: true
        });
      }
    } else if (subcommand === 'budget') {
      const result = await MoneyHave(dbClient, interaction, null, 'bank');

      if (result[0] === 'success') {
        const userHave = result[2];
        const uni = result[3];
        await interaction.reply({
          content: `${interaction.guild.name}は${userHave}${uni}を所持しています。`
        });
      } else if (result[0] === 'fail') {
        await interaction.reply({
          content: result[1],
          ephemeral: true
        });
      } else if (result[0] === 'error') {
        await interaction.reply({
          content: result[1],
          ephemeral: true
        });
      }
    }　if (subcommand === 'replace') {
      const result = await SetMoney(dbClient, interaction);

      if (result[0] === 'success') {
        const userId = result[1];
        const point = result[2];
        const unit = result[3];
        await interaction.reply({
          content: `<@${userId}>のポイントを${point}${unit}に設定しました。`,
          ephemeral: true
        });
      } else if (result[0] === 'fail') {
        await interaction.reply({
          content: result[1],
          ephemeral: true
        });
      } else if (result[0] === 'error') {
        await interaction.reply({
          content: result[1],
          ephemeral: true
        });
      }
    }
  },
};