const { SlashCommandBuilder, Locale } = require('discord.js');
const { MoneyPay, MoneyHave, LogModule } = require('../functions/moneyger.js');

module.exports = {
  // スラッシュコマンドの定義
  data: new SlashCommandBuilder()
    .setName('pt')
    .setDescription('Manage point')
    .setNameLocalization(Locale.Japanese, 'pt')
    .setDescriptionLocalization(Locale.Japanese, 'ポイントに関するコマンド。')
    // give
    .addSubcommand(subcommand =>
      subcommand
        .setName('give')
        .setDescription('.')
        .setDescriptionLocalization(Locale.Japanese, 'ポイントを他ユーザーに送ります。')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('.')
            .setDescriptionLocalization(Locale.Japanese, 'ポイントを送る相手')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('point')
            .setDescription('.')
            .setDescriptionLocalization(Locale.Japanese, '送るポイントの量')
            .setMinValue(0)
            .setMaxValue(90072)
            .setRequired(true)))
    // have
    .addSubcommand(subcommand =>
      subcommand
        .setName('have')
        .setDescription('Have points')
        .setDescriptionLocalization(Locale.Japanese, '所持ポイントを確認します。')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('.')
            .setDescriptionLocalization(Locale.Japanese, '確認するユーザー')
            .setRequired(false))),

  // コマンド実行時の処理
  async execute(interaction, dbClient) {
    // 実行されたサブコマンドの名前を取得
    const subcommand = await LogModule(dbClient, interaction)[1];

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
    } else if (subcommand === 'have') {
      const result = await MoneyHave(dbClient, interaction);

      if (result[0] === 'success') {
        const userId = result[1];
        const userHave = result[2];
        const uni = result[3];
        await interaction.reply({
          content: `<@${userId}>は${userHave}${uni}を所持しています。`,
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