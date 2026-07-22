// ログイン試行のレート制限（ブルートフォース対策）。
// Vercelのサーバーレス関数はウォームインスタンスが短時間の連続リクエストを
// 使い回すことが多いため、インメモリのカウンタでも実用上は有効に働く
// （ただし新しいインスタンスが起動すると失敗回数はリセットされる。完全な
// 保証が必要なら外部ストア（Redis等）が必要だが、個人用アプリの脅威モデル
// としては過剰と判断しこの方式にしている）。

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15分

const attemptsByIp = new Map();

function cleanup(now) {
  for (const [ip, entry] of attemptsByIp) {
    if (now - entry.windowStart > WINDOW_MS) {
      attemptsByIp.delete(ip);
    }
  }
}

// 呼び出す前にチェックする。ブロック中なら { allowed: false, retryAfterSeconds } を返す
export function checkRateLimit(ip) {
  const now = Date.now();
  cleanup(now);

  const entry = attemptsByIp.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    return { allowed: true };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true };
}

// ログイン失敗時に呼ぶ
export function recordFailedAttempt(ip) {
  const now = Date.now();
  const entry = attemptsByIp.get(ip);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    attemptsByIp.set(ip, { count: 1, windowStart: now });
  } else {
    entry.count += 1;
  }
}

// ログイン成功時に呼ぶ（カウンタをクリア）
export function clearAttempts(ip) {
  attemptsByIp.delete(ip);
}
