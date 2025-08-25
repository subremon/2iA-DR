const { SlashCommandBuilder, Locale } = require('discord.js');
const MoneyPay = require('../functions/moneyger.js');

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
        .setDescription('Give points')
        .setDescriptionLocalization(Locale.Japanese, 'ポイントの贈与をします。')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('Select taker')
            .setDescriptionLocalization(Locale.Japanese, '誰に送るか')
            .setRequired(true))
        .addNumberOption(option =>
          option.setName('point')
            .setDescription('Amounts of points')
            .setDescriptionLocalization(Locale.Japanese, 'いくら送るか')
            .addMinValue(0)
            .addMaxValue(90072)
            .setRequired(true))),

  // コマンド実行時の処理
  async execute(interaction, client, dbClient) {
    // 実行されたサブコマンドの名前を取得
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'pay') {
      // payサブコマンドが実行された場合の処理
      // MoneyPay関数を呼び出し、結果を待つ
      const result = await MoneyPay(dbClient, interaction);

      // 応答の処理（以前の回答と同じ）
      if (result[0] === 'succes') {
        const giverId = result[1];
        const takerId = result[2];
        const point = result[3];
        await interaction.reply({
          content: `<@${giverId}>から<@${takerId}>に${point}ポイント送りました。`
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