const { SlashCommandBuilder, Locale } = require('discord.js');
const { MoneyPay, MoneyHave } = require('../functions/moneyger.js');

module.exports = {
  // スラッシュコマンドの定義
  data: new SlashCommandBuilder()
    .setName('money')
    .setDescription('Manage money')
    .setNameLocalization(Locale.Japanese, 'ago')
    .setDescriptionLocalization(Locale.Japanese, 'お金に関するコマンド。')
    // payサブコマンドの追加
    .addSubcommand(subcommand =>
      subcommand
        .setName('give')
        .setDescription('.')
        .setDescriptionLocalization(Locale.Japanese, 'ポイントの贈与をします。')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('.')
            .setDescriptionLocalization(Locale.Japanese, '誰に送るか')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('point')
            .setDescription('.')
            .setDescriptionLocalization(Locale.Japanese, 'いくら送るか')
            .setMinValue(0)
            .setMaxValue(90072)
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('have')
        .setDescription('Have points')
        .setDescriptionLocalization(Locale.Japanese, 'ポイントの確認をします。')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('.')
            .setDescriptionLocalization(Locale.Japanese, '誰のポイントを見るか')
            .setRequired(false))),

  // コマンド実行時の処理
  async execute(interaction, dbClient) {
    // 実行されたサブコマンドの名前を取得
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'give') {
      // payサブコマンドが実行された場合の処理
      // MoneyPay関数を呼び出し、結果を待つ
      const result = await MoneyPay(dbClient, interaction);

      // 応答の処理（以前の回答と同じ）
      if (result[0] === 'success') {
        const giverId = result[1];
        const takerId = result[2];
        const point = result[3];
        const unit = result[4];
        await interaction.reply({
          content: `<@${giverId}>から<@${takerId}>に${point}${unit}送りました。`
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