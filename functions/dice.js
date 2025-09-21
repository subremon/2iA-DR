const crypto = require('crypto');

/**
 * 暗号学的に安全なランダムな整数を生成します。
 * @param {number} min 最小値（包含）
 * @param {number} max 最大値（包含）
 * @returns {number} 指定された範囲内のランダムな整数
 */
function getRandomInt(min, max) {
  // 最大値と最小値が同じ場合はそのまま返す
  if (min === max) {
    return min;
  }

  // 範囲のサイズを計算
  const range = BigInt(max) - BigInt(min) + 1n;

  // 範囲をカバーするのに必要なバイト数を計算
  const byteCount = Math.ceil(Number(range).toString(2).length / 8);

  // 指定されたバイト数のバッファを生成
  const buffer = new Uint8Array(byteCount);

  let randomNumber;
  do {
    // 暗号学的に安全な乱数でバッファを埋める
    crypto.getRandomValues(buffer);

    // バッファからBigIntを生成
    let randomBigInt = 0n;
    for (let i = 0; i < byteCount; i++) {
      randomBigInt = (randomBigInt << 8n) | BigInt(buffer[i]);
    }

    // モジュロ演算で範囲内に収める
    randomNumber = randomBigInt % range;

  // 生成された乱数が範囲外になる可能性を排除するためにループを続ける
  } while (randomNumber >= range);

  // 最終的な値を返す
  return Number(randomNumber + BigInt(min));
}

/**
 * 基本的なダイスを振ります。
 * @param {string} command コマンド文（例: "2D6+3D4-5"）
 * @returns {array} 結果テキスト, 合計値
 */
function BasicDice(command) {
  // ランダム整数生成
  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // ダイスまたは数字のパターンをすべて抽出
  const regex = /([+\-*/]?)(\d*[dD]\d+|\d+)/g;
  const tokens = [];
  let match;

  while ((match = regex.exec(command)) !== null) {
    let operator = match[1] || '+';
    let value = match[2];

    if (value.toLowerCase().includes('d')) {
      // ダイス表記
      const parts = value.toLowerCase().match(/(\d*)d(\d+)/);
      const count = parts[1] ? parseInt(parts[1], 10) : 1;
      const faces = parseInt(parts[2], 10);

      if (count < 1 || faces < 1) return [`${command} --> エラー: ダイスの数や面は1以上です。`, null];
      if (count > Number.MAX_SAFE_INTEGER || faces > Number.MAX_SAFE_INTEGER)
        return [`${command} --> エラー: ダイスの数や面は安全整数範囲内にしてください。`, null];

      const rolls = [];
      for (let i = 0; i < count; i++) {
        rolls.push(getRandomInt(1, faces));
      }

      tokens.push({ operator, type: 'd', count, faces, rolls });
    } else {
      // 数字
      tokens.push({ operator, number: parseInt(value, 10) });
    }
  }

  if (tokens.length === 0) return ['無効なコマンド形式です。', null];

  // 計算
  let sum = 0;
  tokens.forEach((t, idx) => {
    let val;
    if (t.type === 'd') {
      val = t.rolls.reduce((a, b) => a + b, 0);
    } else {
      val = t.number;
    }

    if (idx === 0 && t.operator === '+') {
      sum = val; // 初回はプラスでも直接代入
    } else {
      switch (t.operator) {
        case '+': sum += val; break;
        case '-': sum -= val; break;
        case '*': sum *= val; break;
        case '/': sum /= val; break;
      }
    }
  });

  // 表示用文字列作成
  const display = tokens.map(t => {
    if (t.type === 'd') {
      const rollStr = t.rolls.length > 1 ? `[${t.rolls.join(',')}]` : `${t.rolls[0]}`;
      return `${t.operator}${t.count}d${t.faces}${rollStr}`;
    } else {
      return `${t.operator}${t.number}`;
    }
  }).join(' ');

  return [`${command} --> ${display} --> ${sum}`, sum];
}

module.exports = { BasicDice };
