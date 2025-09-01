const { SlashCommandBuilder, Locale } = require('discord.js');
const { MoneyPay, MoneyHave } = require('../functions/moneyger.js');

module.exports = {
  // スラッシュコマンドの定義
  data: new SlashCommandBuilder()
    .setName('bank')
    .setDescription('Manage bank')
    .setNameLocalization(Locale.Japanese, 'ago')
    .setDescriptionLocalization(Locale.Japanese, 'お金に関する設定コマンド。')
    // currency
    .addSubcommand(subcommand =>
      subcommand
        .setName('currency')
        .setDescription('.')
        .setDescriptionLocalization(Locale.Japanese, 'ポイントの贈与をします。')
        .addStringOption(option =>
          option.setName('new_currency')
            .setDescription('.')
            .setDescriptionLocalization(Locale.Japanese, 'このサーバーで使用する新しい通貨')
            .setMaxLength(20)
            .setRequired(true))),

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
    } else if (subcommand === 'have') {
      const result = await MoneyHave(dbClient, interaction);

      if (result[0] === 'success') {
        const userId = result[1];
        const userHave = result[2];
        const uni = result[3];
        await interaction.reply({
          content: `<@${userId}>は${userHave}${uni}を所持しています。`
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