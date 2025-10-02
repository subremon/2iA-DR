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
 * @param {string} command コマンド文
 * @returns {array} 結果テキスト, 個別ロール結果
 */
function BasicDice(command) {
  const regex = /([+\-*\/]?\d*[dR]\d+)|([+\-*\/]?\d+)/gi;
  const matches = [...command.matchAll(regex)];

  if (!matches.length) return ['無効なコマンド形式です。', null];

  let sumAll = 0;
  let rollResults = [];
  let midlleWork = [];

  for (let m of matches) {
    if (m[1]) { // ダイス表記
      const el = m[1];
      const operatorMatch = el.match(/^[+\-*\/]/);
      const operator = operatorMatch ? operatorMatch[0] : '+';

      const parts = el.replace(/^[+\-*\/]/, '').match(/(\d*)([dR])(\d+)/);
      const number = parts[1] ? Number(parts[1]) : 1;
      const faces = Number(parts[3]);

      if (number < 1 || faces < 1) 
        return [`${command} --> x error: 数字は1以上にしてください。`, null];

      let rolls = [];
      for (let j = 0; j < number; j++) {
        rolls.push(getRandomInt(1, faces));
      }
      const total = rolls.reduce((a, b) => a + b, 0);

      rollResults.push({operator, number, faces, rolls, total});
      midlleWork.push(`${operator}${total}[${rolls.join(',')}]`);

      if (operator === '+') sumAll += total;
      else if (operator === '-') sumAll -= total;
      else if (operator === '*') sumAll *= total;
      else if (operator === '/') sumAll /= total;

    } else if (m[2]) { // 数字
      const el = m[2];
      const operatorMatch = el.match(/^[+\-*\/]/);
      const operator = operatorMatch ? operatorMatch[0] : '+';
      const num = Number(el.replace(/^[+\-*\/]/, ''));

      rollResults.push({operator, total: num});
      midlleWork.push(`${operator}${num}`);

      if (operator === '+') sumAll += num;
      else if (operator === '-') sumAll -= num;
      else if (operator === '*') sumAll *= num;
      else if (operator === '/') sumAll /= num;
    }
  }

  const formattedCommand = matches.map(m => m[0]).join('');
  return [`${formattedCommand} --> ${midlleWork.join(' ')} --> ${sumAll}`, rollResults];
}

// ^^ とりあえず仮

module.exports = { BasicDice };