const { SlashCommandBuilder, PermissionFlagsBits, Locale } = require('discord.js');
const { SetCurrency } = require('../functions/moneyger.js');

module.exports = {
  // スラッシュコマンドの定義
  data: new SlashCommandBuilder()
    .setName('bank')
    .setDescription('Manage bank')
    .setNameLocalization(Locale.Japanese, 'ago')
    .setDescriptionLocalization(Locale.Japanese, 'お金に関する設定コマンド。')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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

    if (subcommand === 'currency') {
      const result = await SetCurrency(dbClient, interaction);

      if (result[0] === 'success') {
        const new_currency = result[1];
        await interaction.reply({
          content: `通貨の名前を${new_currency}に変更しました。`
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