// firebase CLI のログイン失効を回避し、サービスアカウントで
// Firestore セキュリティルールを直接デプロイする（Firebase Rules REST API 経由）。
// 対象は firestore.rules のみ。データ・Hosting・Functions には触れない。
//
//   確認のみ（トークン取得＋ルール構文の送信はせず表示）: node scripts/deploy-firestore-rules.cjs
//   本番デプロイ                                       : node scripts/deploy-firestore-rules.cjs --execute
const admin = require("firebase-admin")
const fs = require("fs")
const path = require("path")

const PROJECT = "toefl-writing-reading-b1197"
const SA_PATH = process.env.TOEFL_SA_KEY || "C:/Users/ykita/.firebase/prepmaster-service-account.json"
const RULES_PATH = path.resolve(__dirname, "..", "firestore.rules")
const EXECUTE = process.argv.includes("--execute")

async function main() {
  const sa = require(path.resolve(SA_PATH))
  const cred = admin.credential.cert(sa)
  const { access_token } = await cred.getAccessToken()
  console.log("✓ サービスアカウントでアクセストークン取得 OK")

  const source = fs.readFileSync(RULES_PATH, "utf8")
  console.log(`✓ firestore.rules 読み込み OK（${source.split("\n").length} 行）`)

  if (!EXECUTE) {
    console.log("\nドライラン: --execute を付けると本番デプロイします。")
    return
  }

  const base = "https://firebaserules.googleapis.com/v1"
  const headers = {
    Authorization: `Bearer ${access_token}`,
    "Content-Type": "application/json",
  }

  // 1) ルールセット作成
  const createRes = await fetch(`${base}/projects/${PROJECT}/rulesets`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      source: { files: [{ name: "firestore.rules", content: source }] },
    }),
  })
  if (!createRes.ok) {
    throw new Error(`ルールセット作成失敗 ${createRes.status}: ${await createRes.text()}`)
  }
  const ruleset = await createRes.json()
  console.log(`✓ ルールセット作成: ${ruleset.name}`)

  // 2) cloud.firestore リリースを新ルールセットへ更新（無ければ作成）
  const releaseName = `projects/${PROJECT}/releases/cloud.firestore`
  const patchRes = await fetch(`${base}/${releaseName}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ release: { name: releaseName, rulesetName: ruleset.name } }),
  })
  if (patchRes.ok) {
    console.log("✓ リリース更新 OK（cloud.firestore を新ルールセットへ）")
  } else {
    // リリース未作成なら作成
    const createRelRes = await fetch(`${base}/projects/${PROJECT}/releases`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: releaseName, rulesetName: ruleset.name }),
    })
    if (!createRelRes.ok) {
      throw new Error(
        `リリース更新/作成失敗 patch=${patchRes.status} create=${createRelRes.status}: ${await createRelRes.text()}`
      )
    }
    console.log("✓ リリース作成 OK（cloud.firestore）")
  }

  console.log("\n=== デプロイ完了 ===")
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("ERROR:", e.message)
    process.exit(1)
  })
