const { Client } = require('pg');

const errors = {
  missingUser: "エラー: 不明なユーザーID。\nその人が存在するか確認しください。",
  missingBank: "その人の口座はまだ作成されていません。"
};

/**
 * データベースで所持金を操作する
 * @param {object} dbClient - PostgreSQLデータベースクライアント
 * @param {object} interaction - Discordインタラクションオブジェクト
 * @param {Number} pointO - pointのオーバーライド
 * @param {string} dummyG - 贈与者IDのオーバーライド
 * @param {string} dummyT - 授与者IDのオーバーライド
 * @param {boolean} unlimit - trueなら贈与者が無から資金を提供
 * @param {boolean} overlimit - trueなら贈与者が所持金がマイナスでも支払い続けられる
 */
async function MoneyPay(dbClient, interaction, pointO, dummyG, dummyT, unlimit = false, overlimit = false) {
  try {
    // サーバーごとの通貨名を取得
    const uniResult = await dbClient.query('SELECT currency_name FROM server_settings WHERE server_id = $1', [interaction.guild.id]);
    const uni = uniResult.rows[0]?.currency_name || 'P';

    // 贈与者と授与者のIDとポイントを取得
    const giverId = dummyG || interaction.userId;
    const takerId = dummyT || interaction.options.getUser("user")?.id;
    const point = pointO || interaction.options.getNumber("point");

    // ユーザーIDが存在しない場合はエラー
    if (!takerId) {
      return ['error', errors.missingUser];
    }
    if (point <= 0) {
      return ['fail', 'ポイントは0より大きい値を指定してください。'];
    }

    // 贈与者と授与者の口座情報を取得
    const giverResult = await dbClient.query('SELECT balance FROM user_balances WHERE user_id = $1', [giverId]);
    const takerResult = await dbClient.query('SELECT balance FROM user_balances WHERE user_id = $1', [takerId]);

    const giver = giverResult.rows[0];
    const taker = takerResult.rows[0];

    // 口座が存在しない場合はエラー
    if (!giver || !taker) {
      return ['error', errors.missingBank];
    }

    // 新しい所持金を計算
    const giverHave = giver.balance;
    const takerHave = taker.balance;

    const giverNew = unlimit ? giverHave : giverHave - point;
    if (giverNew < 0 && !overlimit) {
      return ['fail', `所持金が${Math.abs(giverNew)}${uni}不足しています。`];
    }
    const takerNew = takerHave + point;

    // データベースの更新をトランザクションで実行
    await dbClient.query('BEGIN');
    try {
      // 贈与者の残高を更新
      await dbClient.query('UPDATE user_balances SET balance = $1 WHERE user_id = $2', [giverNew, giverId]);
      // 授与者の残高を更新
      await dbClient.query('UPDATE user_balances SET balance = $1 WHERE user_id = $2', [takerNew, takerId]);
      await dbClient.query('COMMIT');
    } catch (dbError) {
      await dbClient.query('ROLLBACK');
      throw dbError;
    }

    return ['succes', giverId, takerId, point];

  } catch (error) {
    console.error('データベース操作エラー:', error);
    return ['error', '予期せぬエラーが発生しました。'];
  }
}

module.exports = MoneyPay; // ここが重要

  

/*

  if (point === 0) {
    interaction.reply({content: "0以外で入力してください。", ephemeral: false, flags: MessageFlags.bitfield=4096});
    return;
  }
  if (type === "add_event" && searchId === "event") {
    interaction.reply({content: "予期しないエラー。", ephemeral: false, flags: MessageFlags.bitfield=4096});
  }

  if (type === "add") {
    
  } else {
    const bSearchId = type === "add_event" ? "960172159060279377" : String(interaction.user).match(/(\d*)/)[1];
    const bReg = new RegExp(`\\\n@${bSearchId}% : -?\\d+\\$`);
    const bMatches =  data.match(bReg);
    const bUserId = bMatches[0].match(/@(\d+)% : (-?\d+)/)[1];
    const bUserPoint = Number(bMatches[0].match(/@(\d+)% : -?(\d+)/)[2]);
    const bUserAdd = bUserPoint - point;
  }
  if (matches && bMatches) {
    if (bUserAdd >= 0) {
      const userId = matches[0].match(/@(\d+)% : (-?\d+)/)[1];
      const userPoint = Number(matches[0].match(/@(\d+)% : -?(\d+)/)[2]);
      const userAdd = userPoint + point;

      const retxt = `\n@${userId}% : ${userAdd}`;
      const bRetxt = `\n@${bUserId}% : ${bUserAdd}`;
      
      const newData = data.replace(reg, retxt + '$');
      const bNewData = newData.replace(/\n@960172159060279377% : -?\d+\$/, bRetxt + '$');
      fs.writeFile('./bank.mng', bNewData, 'utf8', (err) => {
          if (err) {interaction.reply({content: "エラー。", ephemeral: false, flags: MessageFlags.bitfield=4096});}
      });
      
      if (point >= 1) {
        interaction.reply({content: `イベント報酬！ <@${userId}>に${point+uni}配布しました。現在${userAdd+uni}です。\n-# あと${bUserAdd+uni}配布可能`, flags: MessageFlags.bitfield=4096}); 
      } else {
        interaction.reply({content: `<@${userId}>への配布${uni}を${point}しました。現在${userAdd+uni}です。\n-# あと${bUserAdd+uni}配布可能`, flags: MessageFlags.bitfield=4096});
      }
      
    } else {
      interaction.reply({content: `これ以上配布できません！\n-# ${-bUserAdd+uni}減らしてください`, ephemeral: false, flags: MessageFlags.bitfield=4096});
    }
      
  } else {
    interaction.reply({content: "存在しないユーザーです。", ephemeral: false, flags: MessageFlags.bitfield=4096});
    return;
  }

  */