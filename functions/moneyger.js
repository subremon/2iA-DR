const errors = {
  missingUser: 'エラー: 不明なユーザーID。\nその人が存在するか確認しください。',
  missingBank: 'その人の口座はまだ作成されていません。',
  isBot: 'BOTではないユーザを選択してください。'
};

/**
 * データベースでテーブルの存在を確認し、存在しない場合は作成する
 * @param {object} dbClient - PostgreSQLデータベースクライアント
 */
async function createTables(dbClient) {
  const serversBankTableSql = `
    CREATE TABLE IF NOT EXISTS servers_bank (
      server_id VARCHAR(20) PRIMARY KEY,
      currency_name VARCHAR(20) DEFAULT 'P',
      initial_points INTEGER DEFAULT 0,
      log_channel_id VARCHAR(20)
    );
  `;
  const serverUsersBankTableSql = `
    CREATE TABLE IF NOT EXISTS server_users_bank (
      server_id VARCHAR(20) REFERENCES servers_bank(server_id),
      user_id VARCHAR(20),
      have_money BIGINT DEFAULT 0,
      PRIMARY KEY (server_id, user_id)
    );
  `;

  try {
    console.log('テーブルの存在を確認し、必要に応じて作成します...');
    await dbClient.query(serversBankTableSql);
    await dbClient.query(serverUsersBankTableSql);
    console.log('テーブルのセットアップが完了しました。');
  } catch (error) {
    console.error('データベーステーブルの作成中にエラーが発生しました:', error);
    throw error;
  }
}

/*
 * servers_bank にサーバーIDが存在することを保証する（初期設定）
 * @param {object} dbClient - PostgreSQLデータベースクライアント
 * @param {string} guildId - ギルドID
 */
async function ensureServerInitialized(dbClient, guildId) {
    const defaultCurrency = 'P';
    const defaultInitialPoints = 0;
    
    // サーバーIDが存在しない場合は挿入（ON CONFLICTで競合を無視）
    const sql = `
        INSERT INTO servers_bank (server_id, currency_name, initial_points) 
        VALUES ($1, $2, $3) 
        ON CONFLICT (server_id) DO NOTHING;
    `;
    await dbClient.query(sql, [guildId, defaultCurrency, defaultInitialPoints]);
}

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
 */
async function MoneyPay(dbClient, interaction, pointO, guildO, dummyG, dummyT, unlimit = false, overlimit = false) {
  try {
    await createTables(dbClient); // テーブルの存在を確認し、必要に応じて作成

    // 贈与者と授与者のIDとポイントを取得
    const giverUser = dummyG ? null : interaction.user; // interaction.userは必ず存在
    const takerUser = dummyT ? null : interaction.options.getUser('user'); // ユーザーオブジェクト

    const giverId = dummyG || giverUser.id;
    const takerId = dummyT || takerUser?.id;
    const point = pointO || interaction.options.getInteger('point');
    const guildId = guildO || interaction.guild.id;
    await ensureServerInitialized(dbClient, guildId); 

    // ユーザーIDが存在しない場合はエラー
    if (!takerId) {
      return ['error', errors.missingUser];
    }
    
    // 贈与者（interaction.user）のBOTチェック（dummyGがない場合）
    if (giverUser && giverUser.bot) {
        // 贈与者がボットの場合は通常、エラーにはしないが、ここでは念のためチェック
        // ただし、通常この関数はユーザーからの操作で呼び出されるため、interaction.user.botはfalseのはず。
    }

    // 授与者（userオプション）のBOTチェック（dummyTがない場合）
    if (takerUser && takerUser.bot) {
      return ['error', errors.isBot];
    }
    
    // サーバーごとの通貨名を取得
    const uniResult = await dbClient.query(`SELECT currency_name FROM servers_bank WHERE server_id = $1 LIMIT 1`, [guildId]);
    const uni = uniResult.rows[0]?.currency_name || 'P';

    const iniResult = await dbClient.query(`SELECT initial_points FROM servers_bank WHERE server_id = $1 LIMIT 1`, [guildId]);
    const ini = iniResult.rows[0]?.initial_points || 0;

    const SELECTUSER = `SELECT have_money FROM server_users_bank WHERE server_id = $1 AND user_id = $2 LIMIT 1`;

    // 贈与者と授与者の口座情報を取得
    const giverResult = await dbClient.query(SELECTUSER, [guildId, giverId]);
    const takerResult = await dbClient.query(SELECTUSER, [guildId, takerId]);

    const giverUPSERT = giverResult.rows.length === 0 ?
      `INSERT INTO server_users_bank (server_id, user_id, have_money) VALUES ($1, $2, $3) ON CONFLICT (server_id, user_id) DO UPDATE SET have_money = EXCLUDED.have_money RETURNING have_money` :
      `UPDATE server_users_bank SET have_money = $3 WHERE server_id = $1 AND user_id = $2 RETURNING have_money`;
    const takerUPSERT = takerResult.rows.length === 0 ?
      `INSERT INTO server_users_bank (server_id, user_id, have_money) VALUES ($1, $2, $3) ON CONFLICT (server_id, user_id) DO UPDATE SET have_money = EXCLUDED.have_money RETURNING have_money` :
      `UPDATE server_users_bank SET have_money = $3 WHERE server_id = $1 AND user_id = $2 RETURNING have_money`;

    // 新しい所持金を計算
    const giverHave = giverResult.rows[0]?.have_money || ini;
    const takerHave = takerResult.rows[0]?.have_money || ini;

    const giverNew = unlimit ? giverHave : Number(giverHave) - point;
    if (giverNew < 0 && !overlimit) {
      return ['fail', `所持金が${Math.abs(giverNew)}${uni}不足しています。`];
    }
    const takerNew = giverId != takerId ? Number(takerHave) + point : Number(giverHave);

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

/**
 * データベースで所持金を取得する
 * @param {object} dbClient - PostgreSQLデータベースクライアント
 * @param {object} interaction - Discordインタラクションオブジェクト
 * @param {string} guildO - ギルドIDのオーバーライド
 * @param {string} dummy - ユーザーIDのオーバーライド
 */
async function MoneyHave(dbClient, interaction, guildO, dummy) {
  try {
    await createTables(dbClient); // テーブルの存在を確認し、必要に応じて作成

    // ユーザーIDとユーザーオブジェクトを取得
    const userOption = interaction.options.getUser('user'); // ユーザーオブジェクト
    const userId = dummy || userOption?.id || interaction.user.id;
    const guildId = guildO || interaction.guild.id;

    // ユーザーIDが存在しない場合はエラー
    if (!userId) {
      return ['error', errors.missingUser];
    }
    
    // ユーザー（userオプション）のBOTチェック
    // dummyでない、かつ、ユーザーオプションが存在する、かつ、それがボットである場合
    if (!dummy && userOption && userOption.bot) {
      return ['error', errors.isBot];
    }

    // サーバーごとの通貨名を取得
    const uniResult = await dbClient.query(`SELECT currency_name FROM servers_bank WHERE server_id = $1 LIMIT 1`, [guildId]);
    const uni = uniResult.rows[0]?.currency_name || 'P';

    const iniResult = await dbClient.query(`SELECT initial_points FROM servers_bank WHERE server_id = $1 LIMIT 1`, [guildId]);
    const ini = iniResult.rows[0]?.initial_points || 0;

    const SELECTUSER = `SELECT have_money FROM server_users_bank WHERE server_id = $1 AND user_id = $2 LIMIT 1`;

    // ユーザーの口座情報を取得
    const userResult = await dbClient.query(SELECTUSER, [guildId, userId]);
    const userHave = userResult.rows[0]?.have_money || ini;

    return ['success', userId, userHave, uni];

  } catch (error) {
    console.error('データベース操作エラー:', error);
    return ['error', '予期せぬエラーが発生しました。'];
  }
}

/**
 * データベースで所持金を設定する
 * @param {object} dbClient - PostgreSQLデータベースクライアント
 * @param {object} interaction - Discordインタラクションオブジェクト
 * @param {Number} pointO - pointのオーバーライド
 * @param {string} guildO - ギルドIDのオーバーライド
 * @param {string} dummy - ユーザーIDのオーバーライド
 */
async function SetMoney(dbClient, interaction, pointO, guildO, dummy) {
  try {
    await createTables(dbClient); // テーブルの存在を確認し、必要に応じて作成

    // ユーザーIDとユーザーオブジェクトを取得
    const userOption = interaction.options.getUser('user'); // ユーザーオブジェクト
    const userId = dummy || userOption?.id;
    const point = pointO || interaction.options.getInteger('point');
    const guildId = guildO || interaction.guild.id;

    // ユーザーIDが存在しない場合はエラー
    if (!userId) {
      return ['error', errors.missingUser];
    }
    
    // ユーザー（userオプション）のBOTチェック
    // dummyでない、かつ、ユーザーオプションが存在する、かつ、それがボットである場合
    if (!dummy && userOption && userOption.bot) {
      return ['error', errors.isBot];
    }

    // サーバーごとの通貨名を取得
    const uniResult = await dbClient.query(`SELECT currency_name FROM servers_bank WHERE server_id = $1 LIMIT 1`, [guildId]);
    const uni = uniResult.rows[0]?.currency_name || 'P';

    // データベースの更新をトランザクションで実行
    await dbClient.query('BEGIN');
    try {
      // ユーザーの残高を更新
      await dbClient.query(`INSERT INTO server_users_bank (server_id, user_id, have_money) VALUES ($1, $2, $3) ON CONFLICT (server_id, user_id) DO UPDATE SET have_money = EXCLUDED.have_money RETURNING have_money`, [guildId, userId, point]);
      await dbClient.query('COMMIT');
    } catch (dbError) {
      await dbClient.query('ROLLBACK');
      throw dbError;
    }

    return ['success', userId, point, uni];

  } catch (error) {
    console.error('データベース操作エラー:', error);
    return ['error', '予期せぬエラーが発生しました。'];
  }
}

// 以下の関数はユーザー操作に関連しないため、修正は不要です。

async function SetCurrency(dbClient, interaction, guildO) {
  try {
    await createTables(dbClient); // テーブルの存在を確認し、必要に応じて作成

    // 贈与者と授与者のIDとポイントを取得
    const new_currency = interaction.options.getString('currency_name');
    const guildId = guildO || interaction.guild.id;

    const iniResult = await dbClient.query(`SELECT initial_points FROM servers_bank WHERE server_id = $1 LIMIT 1`, [guildId]);
    const initial_points = iniResult.rows[0]?.initial_points || 0;

    // データベースの更新をトランザクションで実行
    await dbClient.query('BEGIN');
    try {
      // 贈与者の残高を更新
      await dbClient.query(`INSERT INTO servers_bank (server_id, currency_name, initial_points) VALUES ($1, $2, $3) ON CONFLICT (server_id) DO UPDATE SET currency_name = EXCLUDED.currency_name RETURNING currency_name`, [guildId, new_currency, initial_points]);
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
    await createTables(dbClient); // テーブルの存在を確認し、必要に応じて作成

    // 贈与者と授与者のIDとポイントを取得
    const new_initial_points = interaction.options.getInteger('initial_points');
    const guildId = guildO || interaction.guild.id;

    const curResult = await dbClient.query(`SELECT currency_name FROM servers_bank WHERE server_id = $1 LIMIT 1`, [guildId]);
    const currency = curResult.rows[0]?.currency_name || 'P';

    // データベースの更新をトランザクションで実行
    await dbClient.query('BEGIN');
    try {
      // 贈与者の残高を更新
      await dbClient.query(`INSERT INTO servers_bank (server_id, currency_name, initial_points) VALUES ($1, $2, $3) ON CONFLICT (server_id) DO UPDATE SET initial_points = EXCLUDED.initial_points RETURNING initial_points`, [guildId, currency, new_initial_points]);
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

async function SetLogChannel(dbClient, interaction, channelO) {
  try {
    await createTables(dbClient); // テーブルの存在を確認し、必要に応じて作成

    const guildId = interaction.guild.id;
    const log_channel = channelO || interaction.options.getChannel('log_channel_locate')?.id;

    const curResult = await dbClient.query(`SELECT currency_name FROM servers_bank WHERE server_id = $1 LIMIT 1`, [guildId]);
    const currency = curResult.rows[0]?.currency_name || 'P';

    const iniResult = await dbClient.query(`SELECT initial_points FROM servers_bank WHERE server_id = $1 LIMIT 1`, [guildId]);
    const initial_points = iniResult.rows[0]?.initial_points || 0;

    // データベースの更新をトランザクションで実行
    await dbClient.query('BEGIN');
    try {
      // 贈与者の残高を更新
      await dbClient.query(`INSERT INTO servers_bank (server_id, currency_name, initial_points, log_channel_id) VALUES ($1, $2, $3, $4) ON CONFLICT (server_id) DO UPDATE SET log_channel_id = EXCLUDED.log_channel_id RETURNING log_channel_id`, [guildId, currency, initial_points, log_channel]);
      await dbClient.query('COMMIT');
    } catch (dbError) {
      await dbClient.query('ROLLBACK');
      throw dbError;
    }

    return ['success', log_channel];

  } catch (error) {
    console.error('データベース操作エラー:', error);
    return ['error', '予期せぬエラーが発生しました。'];
  }
}

async function LogModule(dbClient, interaction) {
  if (!interaction.isChatInputCommand()) return [interaction.commandName, interaction.options.getSubcommand(false)];

  // オプション情報を整形
  const optionsString = interaction.options.data
    .map(option => {
      // オプション名と値を結合
      if (option.value) {
        return `${option.name}:${option.value}`;
      }
      return option.name; // 値がない場合（サブコマンドなど）
    })
    .join(' ');

  // サブコマンドを取得 (もしあれば)
  const subcommand = interaction.options.getSubcommand() || '';
  

  try {
    await createTables(dbClient); 
  } catch (e) {
    console.error("LogModuleでのテーブル作成中にエラー:", e);
    // テーブル作成が失敗した場合、ログ機能は諦める
    return interaction.subcommand; 
  }

  // チャンネル名を取得
  const channelId = interaction.channel?.id || '000000000000000000';

  // 最終的なログメッセージを生成
  const logMessage = `
    application command ran: /${interaction.commandName} ${subcommand} ${optionsString}
    in: <#${channelId}>
  `.trim(); // 余分な空白を削除

  const logResult = await dbClient.query(`SELECT log_channel_id FROM servers_bank WHERE server_id = $1 LIMIT 1`, [interaction.guild.id]);
  const log_channel = logResult.rows[0]?.log_channel_id;

  if (log_channel) {
    try {
        interaction.guild.channels.cache.get(log_channel).send(logMessage);
    } catch (e) {
        console.error("ログチャンネルへの送信に失敗しました:", e);
    }
  }

  return subcommand;
}

module.exports = { MoneyPay, MoneyHave, SetMoney, SetCurrency, SetInitial, SetLogChannel, LogModule };