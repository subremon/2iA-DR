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
 * @returns {array} 結果テキスト, ロール結果
 */
function BasicDice(command) {
  const match = command.match(/(-?\d+)?([+\-*\/]\d+)*([+\-*\/]?\d*[DR]\d+)+(?:([+\-*\/]\d+)|([+\-*\/]\d*[DR]\d+))*/i);
  if (!match) return ['無効なコマンド形式です。', null];
  if (/^\d+$/.test(match[0])) match[0] = `+${match[0]}`;
  match.filter(el => el !== '');

  let midlleWork = '';
  let error = null;
  match.array.forEach(el => {
    if(/[+\-*\/]?\d*[DR]\d+/i.test(el)) {
      const match = el.match(/([+\-*\/])?(\d*)[DR](\d+)/i);
      const number = match[2] ? Number(match[1]) : 1;
      const faces = Number(match[3]);

      if (number < 1) error = [`${command}\u00a0-->x error:\u00a0ダイスの数は1以上にしてください。`, null];
      if (number > Number.MAX_SAFE_INTEGER) return [`$${command}\u00a0-->x error:\u00a0$ダイスの数は\u00a0は${Number.MAX_SAFE_INTEGER}以下にしてください。`, null];
      if (faces < 1) error = [`${command}\u00a0-->x error:\u00a0面の数は1以上にしてください。`, null];
      if (faces > Number.MAX_SAFE_INTEGER) return [`$${command}\u00a0-->x error:\u00a0$面の数は\u00a0は${Number.MAX_SAFE_INTEGER}以下にしてください。`, null];

      let resultArray = [];
      for (let i = 0; i < number; i++) {
        resultArray.push(getRandomInt(1, faces));
      }

      result = resultArray.reduce((sum, current) => sum + current, 0);
      midlleWork += `${resultArray.join(' ')}`;
    } else {
      midlleWork += el;
    }
  });
  if (error) return error;

  let sum = 0; 
  for (let i = 0; i < match.length; i++) {
    const element = match[index];
    
  }


  const number = match[1] ? Number(match[1]) : 1;
  const faces = Number(match[3]);

  if (number < 1) return [`${command}\u00a0-->x error:\u00a0ダイスの数は1以上にしてください。`, null];
  if (faces < 1) return [`${command}\u00a0-->x error:\u00a0面の数は1以上にしてください。`, null];
  if (faces > Number.MAX_SAFE_INTEGER) return [`$${command}\u00a0-->x error:\u00a0${match[1]}<number>\u00a0は${Number.MAX_SAFE_INTEGER}以下にしてください。`, null];

  let resultArray = [];
  for (let i = 0; i < number; i++) {
    resultArray.push(getRandomInt(1, faces));
  }

  result = resultArray.reduce((sum, current) => sum + current, 0);
  resultText = `${command}\u00a0(${number}d${faces}) -->\u00a0${result}[\u00a0${resultArray.join(', ')}\u00a0] -->\u00a0${result}`;

  return [resultText, result];
}

module.exports = { BasicDice };
