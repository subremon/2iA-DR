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
 * min, max, rangeに基づいて乱数を生成する関数
 * @param {number} min 最小値（包含）
 * @param {number} max 最大値（包含）
 * @param {number} range 直前の値から除外する範囲
 * @param {number} [previousValue=null] 直前に生成された値
 * @returns {number} 分離された範囲内の乱数
 */
function getDefactoRandom(min, max, range, previousValue = null) {
    if (previousValue === null) {
        // 初回実行時は通常の乱数を生成
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // rangeの制約を考慮
    // rangeがmin,maxの範囲を超える場合、生成可能な値は非常に限定される
    // 例：バーカウンター問題のように、最も遠い席しか選べなくなる
    const valuesToExclude = new Set();
    for (let i = 0; i <= range; i++) {
        // 直前の値とその左右の値をすべて除外
        valuesToExclude.add(previousValue - i);
        valuesToExclude.add(previousValue + i);
    }

    const possibleValues = [];
    for (let i = min; i <= max; i++) {
        if (!valuesToExclude.has(i)) {
            possibleValues.push(i);
        }
    }

    if (possibleValues.length === 0) {
        throw new Error('生成可能な乱数がありません。min, max, rangeの設定を見直してください。');
    }

    // 候補からランダムに1つ選択
    const randomIndex = Math.floor(Math.random() * possibleValues.length);
    return possibleValues[randomIndex];
}

/**
 * 基本的なダイスを振ります。
 * @param {string} command コマンド文
 * @returns {array} 結果コマンド, ロール結果
 */
async function BasicDice(command) {
  const match = command.match(/([A-Z])(\d+)/i);
  if (!match) {
    return ['無効なコマンド形式です。', 1];
  }
  const max = Number(match[2]);

  if (max < 1) return [`${command}\n-->x\serror:\s${match[1]}<number>\sは1以上にしてください。`, 1];
  if (max > Number.MAX_SAFE_INTEGER) return [`$${command}\n-->x\serror:\s${match[1]}<number>\sは${Number.MAX_SAFE_INTEGER}以下にしてください。`, 1];
  const result = getRandomInt(1, max);
  return [`${command}\s-->\s${relust}`, result];
}

module.exports = { BasicDice };