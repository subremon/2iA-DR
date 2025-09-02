const errors = {
  missingUser: "エラー: 不明なユーザーID。\nその人が存在するか確認しください。",
  missingBank: "その人の口座はまだ作成されていません。"
};

/**
 * データベースで所持金を操作する
 * @param {object} dbClient - PostgreSQLデータベースクライアント
 * @param {object} interaction - Discordインタラクションオブジェクト
 * @param {Number} pointO - pointのオーバーライド
 * @param {string} guildO - ギルドIDのオーバーライド
 * @param {string} dummyG - 贈与者IDのオーバーライド
 * @param {string} dummyT - 授与者IDのオーバーライド
 * @param {boolean} unlimit - trueなら贈与者が無から資金を提供
 * @param {boolean} overlimit - trueなら贈与者が所持金がマイナスでも支払い続けられる
 * @param {boolean} bank - trueならbankに送金
 */
async function MoneyPay(dbClient, interaction, pointO, guildO, dummyG, dummyT, unlimit = false, overlimit = false, bank=false) {
  try {
    // 贈与者と授与者のIDとポイントを取得
    const giverId = dummyG || interaction.user.id;
    const takerId = dummyT || interaction.options.getUser("user")?.id;
    const point = pointO || interaction.options.getInteger("point");
    const guildId = guildO || interaction.guild.id;
    
    // サーバーごとの通貨名を取得
    const uniResult = await dbClient.query(`SELECT currency_name FROM servers WHERE server_id = $1 LIMIT 1`, [guildId]);
    const uni = uniResult.rows[0]?.currency_name || 'P';
    
    const iniResult = await dbClient.query(`SELECT initial_points FROM servers WHERE server_id = $1 LIMIT 1`, [guildId]);
    const ini = iniResult.rows[0]?.initial_points || 100;

    // ユーザーIDが存在しない場合はエラー
    if (!takerId) {
      return ['error', errors.missingUser];
    }
    if (point <= 0) {
      return ['fail', 'ポイントは0より大きい値を指定してください。'];
    }

    const SELECTUSER = `SELECT have_money FROM server_users WHERE server_id = $1 AND user_id = $2 LIMIT 1`;
    const SELECTBANK = `SELECT have_money FROM servers WHERE server_id = $1 LIMIT 1`;

    // 贈与者と授与者の口座情報を取得
    const giverResult = bank ? await dbClient.query(SELECTBANK, [guildId]) : await dbClient.query(SELECTUSER, [guildId, giverId]);
    const takerResult = await dbClient.query(SELECTUSER, [guildId, takerId]);

    const giverUPSERT = bank ? (giverResult.rows.length === 0 ?
    `INSERT INTO servers (server_id, have_money) VALUES ($1, $2) ON CONFLICT (server_id) DO UPDATE SET have_money = EXCLUDED.have_money RETURNING have_money` : 
    `UPDATE servers SET have_money = $2 WHERE server_id = $1 RETURNING have_money`)
     : (giverResult.rows.length === 0 ? 
    `INSERT INTO server_users (server_id, user_id, have_money) VALUES ($1, $2, $3) ON CONFLICT (server_id, user_id) DO UPDATE SET have_money = EXCLUDED.have_money RETURNING have_money` : 
    `UPDATE server_users SET have_money = $3 WHERE server_id = $1 AND user_id = $2 RETURNING have_money`);
    const takerUPSERT = takerResult.rows.length === 0 ? 
    `INSERT INTO server_users (server_id, user_id, have_money) VALUES ($1, $2, $3) ON CONFLICT (server_id, user_id) DO UPDATE SET have_money = EXCLUDED.have_money RETURNING have_money` : 
    `UPDATE server_users SET have_money = $3 WHERE server_id = $1 AND user_id = $2 RETURNING have_money`;

    // 新しい所持金を計算
    const giverHave = giverResult.rows[0]?.have_money || ini;
    const takerHave = takerResult.rows[0]?.have_money || ini;

    const giverNew = unlimit ? giverHave : Number(giverHave) - point;
    if (giverNew < 0 && !overlimit) {
      return ['fail', `所持金が${Math.abs(giverNew)}${uni}不足しています。`];
    }
    const takerNew = giverId != takerId || bank ? Number(takerHave) + point : Number(giverHave);

    // データベースの更新をトランザクションで実行
    await dbClient.query('BEGIN');
    try {
      // 贈与者の残高を更新
      await dbClient.query(giverUPSERT, [guildId, giverId, giverNew]);
      // 授与者の残高を更新
      await dbClient.query(takerUPSERT, [guildId, takerId, takerNew]);
      await dbClient.query('COMMIT');
    } catch (dbError) {
      await dbClient.query('ROLLBACK');
      throw dbError;
    }

    return ['success', giverId, takerId, point, uni];

  } catch (error) {
    console.error('データベース操作エラー:', error);
    return ['error', '予期せぬエラーが発生しました。'];
  }
}

async function MoneyHave(dbClient, interaction, guildO, dummy) {
  try {
    // 贈与者と授与者のIDとポイントを取得
    const userId = dummy || interaction.options.getUser("user")?.id || interaction.user.id;
    const guildId = guildO || interaction.guild.id;
    
    // サーバーごとの通貨名を取得
    const uniResult = await dbClient.query(`SELECT currency_name FROM servers WHERE server_id = $1 LIMIT 1`, [guildId]);
    const uni = uniResult.rows[0]?.currency_name || 'P';

    // ユーザーIDが存在しない場合はエラー
    if (!userId) {
      return ['error', errors.missingUser];
    }

    const SELECTUSER = `SELECT have_money FROM server_users WHERE server_id = $1 AND user_id = $2 LIMIT 1`;

    // 贈与者と授与者の口座情報を取得
    const userResult = await dbClient.query(SELECTUSER, [guildId, userId]);
    const userHave = userResult.rows[0]?.have_money || 100;

    return ['success', userId, userHave, uni];

  } catch (error) {
    console.error('データベース操作エラー:', error);
    return ['error', '予期せぬエラーが発生しました。'];
  }
}

async function SetCurrency(dbClient, interaction, guildO) {
  try {
    // 贈与者と授与者のIDとポイントを取得
    const new_currency = interaction.options.getString("currency_name");
    const guildId = guildO || interaction.guild.id;

    // データベースの更新をトランザクションで実行
    await dbClient.query('BEGIN');
    try {
      // 贈与者の残高を更新
      await dbClient.query(`INSERT INTO servers (server_id, initial_points) VALUES ($1, $2) ON CONFLICT (server_id) DO UPDATE SET initial_points = EXCLUDED.initial_points RETURNING initial_points`, [guildId, new_currency]);
      await dbClient.query('COMMIT');
    } catch (dbError) {
      await dbClient.query('ROLLBACK');
      throw dbError;
    }

    return ['success', new_currency];

  } catch (error) {
    console.error('データベース操作エラー:', error);
    return ['error', '予期せぬエラーが発生しました。'];
  }
}

async function SetInitial(dbClient, interaction, guildO) {
  try {
    // 贈与者と授与者のIDとポイントを取得
    const new_initial_points = interaction.options.getInteger("initial_points") || 50;
    const guildId = guildO || interaction.guild.id;

    // データベースの更新をトランザクションで実行
    await dbClient.query('BEGIN');
    try {
      // 贈与者の残高を更新
      await dbClient.query(`INSERT INTO servers (server_id, initial_points) VALUES ($1, $2) ON CONFLICT (server_id) DO UPDATE SET initial_points = EXCLUDED.initial_points RETURNING initial_points`, [guildId, new_initial_points]);
      await dbClient.query('COMMIT');
    } catch (dbError) {
      await dbClient.query('ROLLBACK');
      throw dbError;
    }

    return ['success', new_initial_points];

  } catch (error) {
    console.error('データベース操作エラー:', error);
    return ['error', '予期せぬエラーが発生しました。'];
  }
}

module.exports = { MoneyPay, MoneyHave, SetCurrency, SetInitial }; // ここが重要

  

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