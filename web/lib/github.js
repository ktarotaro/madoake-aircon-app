const API_BASE = "https://api.github.com";

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };
}

// リポジトリ内のファイルをJSONとして取得する（存在しなければ null）
export async function getJsonFile({ token, owner, repo, path, branch }) {
  const res = await fetch(
    `${API_BASE}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    { headers: headers(token), cache: "no-store" }
  );

  if (res.status === 404) {
    return { data: null, sha: null };
  }
  if (!res.ok) {
    throw new Error(`GitHub Contents API エラー（取得）: ${res.status} ${await res.text()}`);
  }

  const body = await res.json();
  const content = Buffer.from(body.content, "base64").toString("utf8");
  return { data: JSON.parse(content), sha: body.sha };
}

// リポジトリ内のファイルをJSONとして書き込む（新規作成 or 更新）
export async function putJsonFile({ token, owner, repo, path, branch, data, message, sha }) {
  const content = Buffer.from(JSON.stringify(data, null, 2) + "\n", "utf8").toString("base64");

  const res = await fetch(`${API_BASE}/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    headers: headers(token),
    body: JSON.stringify({ message, content, branch, sha: sha ?? undefined }),
  });

  if (!res.ok) {
    throw new Error(`GitHub Contents API エラー（更新）: ${res.status} ${await res.text()}`);
  }

  return res.json();
}
