const { SlashCommandBuilder, PermissionFlagsBits, Locale } = require('discord.js');
const { MoneyPay, SetCurrency, SetInitial } = require('../functions/moneyger.js');

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
            .setDescriptionLocalization(Locale.Japanese, 'このサーバーで使用する通貨名')
            .setMaxLength(64)
            .setRequired(false))
        .addIntegerOption(option =>
          option.setName('initial_points')
            .setDescription('.')
            .setDescriptionLocalization(Locale.Japanese, 'このサーバーで使用する初期ポイント')
            .setMinValue(0)
            .setMaxValue(90072)
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('pay')
        .setDescription('.')
        .setDescriptionLocalization(Locale.Japanese, 'サーバーのポイントを支払います。')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('.')
            .setDescriptionLocalization(Locale.Japanese, '操作する相手')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('point')
            .setDescription('.')
            .setDescriptionLocalization(Locale.Japanese, '操作するポイント量')
            .setMinValue(-90072)
            .setMaxValue(90072)
            .setRequired(true))),

  async execute(interaction, dbClient) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'setting') {
      let a = "";
      let b = "";

      if (interaction.options.getInteger("set_currency")) {
        const result = await SetCurrency(dbClient, interaction);
        if (result[0] === 'success') {
          const new_currency = result[1];
          a = `通貨の名前を${new_currency}に変更しました。`;
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
      if (interaction.options.getInteger("initial_points")) {
        const result2 = await SetInitial(dbClient, interaction);
        if (result2[0] === 'success') {
          const new_currency = result[1];
          b = `初期金を${new_currency}に変更しました。`;
        } else if (result2[0] === 'fail') {
          await interaction.reply({
            content: result[1],
            ephemeral: true
          });
        } else if (result2[0] === 'error') {
          await interaction.reply({
            content: result[1],
            ephemeral: true
          });
        } 
      }

      await interaction.reply({ content: `${a}\n${b}` });
    } if (subcommand === 'pay') {
      const result = await MoneyPay({dbClient, interaction, bank: true});

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