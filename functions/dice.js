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
  // d/R のダイス表記が先頭に来た場合、'1'を付与 (例: d6 -> 1d6)
  if (/^[dR]\d+/i.test(command)) {
    command = '1' + command;
  }
  
  // 修正後の正規表現: 
  // (1) Op(N Dice Faces) : ([+\-*\/]?)(\d+)([dR])(\d+) 
  //     -> m[1]: Op, m[2]: Num, m[3]: d/R, m[4]: Faces
  // (2) Op(Number) : ([+\-*\/]?\d+) 
  //     -> m[5]: OpNum (演算子付き数字、例: +3, -10)
  const fixed_regex = /([+\-*\/]?)(\d+)([dR])(\d+)|([+\-*\/]?\d+)/gi;
  const fixed_matches = [...command.matchAll(fixed_regex)];

  if (!fixed_matches.length) return ['無効なコマンド形式です。', null];

  let finalSum = 0;
  let finalRollResults = [];
  let finalMiddleWork = [];

  for (let i = 0; i < fixed_matches.length; i++) {
      const m = fixed_matches[i];
      
      if (m[3]) { // (1) ダイス表記の処理
          // 演算子を抽出 (1個目以外で空の場合はエラーの可能性もあるが、ここでは '+' と見なす)
          const op = m[1] || (i === 0 ? '+' : ''); 
          const number = Number(m[2]);
          const faces = Number(m[4]);

          if (number < 1 || faces < 1) return [`${command} --> x error: 数字は1以上にしてください。`, null];

          let rolls = [];
          for (let j = 0; j < number; j++) {
              rolls.push(getRandomInt(1, faces));
          }
          const total = rolls.reduce((a, b) => a + b, 0);

          const actual_op = op || '+'; // 演算子がない場合は '+'
          finalRollResults.push({ operator: actual_op, number, faces, rolls, total });
          
          const work_str = `${total}[${rolls.join(',')}]`;
          // 中間式には演算子を付与
          finalMiddleWork.push(op + work_str);

          // 演算
          if (actual_op === '+') finalSum += total;
          else if (actual_op === '-') finalSum -= total;
          else if (actual_op === '*') finalSum *= total;
          else if (actual_op === '/') finalSum /= total;
          
      } else if (m[5]) { // (2) 数字の処理
          let el = m[5]; // 例: '+3', '5', '-10'
          
          // 演算子を抽出
          const operatorMatch = el.match(/[+\-*\/]/);
          const op = operatorMatch ? operatorMatch[0] : (i === 0 ? '+' : ''); // 1個目の要素で演算子がない場合は '+'
          
          // 演算子を取り除いた数値を取得
          const numStr = el.replace(/[+\-*\/]/, '');
          const num = Number(numStr);
          
          const actual_op = op || '+'; // 演算子がない場合は '+'
          finalRollResults.push({ operator: actual_op, total: num });
          
          // 中間式を整形 (1個目以外は演算子付きの文字列を使用)
          if (i === 0 && !operatorMatch) {
              finalMiddleWork.push(`${num}`); // 1個目で演算子なし
          } else {
              finalMiddleWork.push(`${el}`); // 演算子付き、または2個目以降
          }
          
          // 演算
          if (actual_op === '+') finalSum += num;
          else if (actual_op === '-') finalSum -= num;
          else if (actual_op === '*') finalSum *= num;
          else if (actual_op === '/') finalSum /= num;
      }
  }

  // 表示の整形: 1個目の要素がダイス/数字で、`+` から始まっている場合は削除
  if (finalMiddleWork.length > 0 && finalMiddleWork[0].startsWith('+')) {
      // ダイス結果（例: `+3[1,2]`）か数字（例: `+5`）かを問わず、先頭の `+` を削除
      finalMiddleWork[0] = finalMiddleWork[0].substring(1);
  }
  
  // コマンドの整形 (マッチした文字列を結合し、元の形式に近づける)
  const formattedCommand = fixed_matches.map(m => m[0]).join('');

  // 途中の計算式が必要な場合のみ ` --> ...` を追加
  const middleWorkStr = finalMiddleWork.join(' ');
  const resultStr = `${formattedCommand} --> ${middleWorkStr === String(finalSum) ? '' : `${middleWorkStr} --> `}${finalSum}`;
  
  return [resultStr, finalRollResults];
}

// ^^ とりあえず仮

module.exports = { BasicDice };