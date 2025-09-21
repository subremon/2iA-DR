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
 * 括弧付き式対応ダイス関数（演算優先度・個別ロール表示）
 * @param {string} expr 式 (例: "(2+3)d(1d4+2)")
 * @returns [表示文字列, 合計値, 個別ロール配列]
 */
function BasicDice(expr) {
  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // トークン化用正規表現
  const tokenRegex = /\d+d\d+|\d+|[()+\-*/]/gi;

  // ダイスや数字、演算子をトークン化
  function tokenize(s) {
    return s.match(tokenRegex) || [];
  }

  // 再帰評価関数
  function parse(tokens) {
    const values = [];
    const operators = [];
    const rollsLog = [];

    function applyOp() {
      const b = values.pop();
      const a = values.pop();
      const op = operators.pop();
      switch(op) {
        case '+': values.push(a + b); break;
        case '-': values.push(a - b); break;
        case '*': values.push(a * b); break;
        case '/': values.push(a / b); break;
      }
    }

    let i = 0;
    while (i < tokens.length) {
      const t = tokens[i];
      if (/^\d+d\d+$/i.test(t)) {
        // ダイス
        const [nStr,fStr] = t.toLowerCase().split('d');
        const n = parseInt(nStr,10);
        const f = parseInt(fStr,10);
        const rolls = [];
        for(let j=0;j<n;j++) rolls.push(getRandomInt(1,f));
        rollsLog.push({count:n, faces:f, rolls:rolls.slice()});
        values.push(rolls.reduce((a,b)=>a+b,0));
        i++;
      } else if (/^\d+$/.test(t)) {
        values.push(parseInt(t,10));
        i++;
      } else if (t==='(') {
        // 括弧内を探す
        let depth=1, j=i+1;
        while(j<tokens.length && depth>0){
          if(tokens[j]==='(') depth++;
          if(tokens[j]===')') depth--;
          j++;
        }
        if(depth>0) throw new Error("括弧が閉じられていません");
        const subTokens = tokens.slice(i+1,j-1);
        values.push(parse(subTokens).total);
        rollsLog.push(...parse(subTokens).rollsLog); // 中のロールも記録
        i=j;
      } else if (/[+\-*/]/.test(t)) {
        while(operators.length>0 &&
             ( (t==='+'||t==='-') && (operators[operators.length-1]==='*'||operators[operators.length-1]==='/') ||
               (t==='+'||t==='-'||t==='*'||t==='/') ) ) {
          applyOp();
        }
        operators.push(t);
        i++;
      } else {
        throw new Error("不正なトークン: "+t);
      }
    }

    while(operators.length>0) applyOp();

    return {total: values[0], rollsLog};
  }

  try {
    const tokens = tokenize(expr);
    const {total, rollsLog} = parse(tokens);

    // 表示用文字列作成
    const rollStr = rollsLog.map(r => `${r.count}d${r.faces}[${r.rolls.join(',')}]`).join(' + ');
    const display = rollStr ? `${expr} --> ${rollStr} --> ${total}` : `${expr} --> ${total}`;

    return [display, total, rollsLog];
  } catch(err) {
    return [`${expr} --> エラー: ${err.message}`, null, null];
  }
}

module.exports = { BasicDice };