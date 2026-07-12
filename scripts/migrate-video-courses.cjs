// english-gym-admin (englishgym-ios-app) の動画コース 7 コースを
// toefl-writing-master (toefl-writing-reading-b1197) の Firestore へ移行する。
//
//   ドライラン（読み取り・接続確認のみ）: node scripts/migrate-video-courses.cjs
//   本番実行（toefl へ書き込み）        : node scripts/migrate-video-courses.cjs --execute
//
// ドキュメント ID は移行元と同一のまま複製する（レッスンリンク・並びを安定させるため）。
// 進捗(videoCourseProgress)はユーザーが別基盤のため移行しない。
const admin = require("firebase-admin")

const SRC_PROJECT = "englishgym-ios-app"
const DST_PROJECT = "toefl-writing-reading-b1197"

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS =
    require("os").homedir() + "/AppData/Roaming/gcloud/application_default_credentials.json"
}

const EXECUTE = process.argv.includes("--execute")

// 移行対象の 7 コース（コード側で確定済み）
const TARGET_COURSE_IDS = [
  "xMc4uHLio8PmloapgPjL", // IELTS Reading
  "MJL6ah5kFcbAf6Rzxb0d", // IELTS Listening
  "pnIlSHCrufeqBsNVPJs1", // IELTS Speaking
  "Si4RTmsEqcElyJNatAWA", // IELTS Writing
  "DDwxKLajzcyDrpDSGOlX", // TOEICマスター
  "7I1Awudh2b9npW6lTJSg", // ライティング添削データベース
  "nl1butmt8QbrisHguIHo", // リーディング解説データベース
]

const COURSES = "videoCourses"
const MODULES = "videoCourseModules"
const LESSONS = "videoCourseLessons"

const srcApp = admin.initializeApp(
  { credential: admin.credential.applicationDefault(), projectId: SRC_PROJECT },
  "src"
)
const dstApp = admin.initializeApp(
  { credential: admin.credential.applicationDefault(), projectId: DST_PROJECT },
  "dst"
)
const src = srcApp.firestore()
const dst = dstApp.firestore()

async function main() {
  console.log(`\nモード: ${EXECUTE ? "本番実行（書き込みあり）" : "ドライラン（読み取りのみ）"}`)
  console.log(`移行元: ${SRC_PROJECT}  →  移行先: ${DST_PROJECT}\n`)

  // 移行先への接続確認（read）
  try {
    const probe = await dst.collection(COURSES).limit(1).get()
    console.log(`✓ 移行先 Firestore 読み取り OK（既存 videoCourses 概数: ${probe.size >= 1 ? "1+" : 0}）`)
  } catch (e) {
    console.error(`✗ 移行先 Firestore へアクセスできません: ${e.message}`)
    console.error("  ADC のアカウントが toefl プロジェクトの Firestore 権限を持っているか確認してください。")
    process.exit(1)
  }

  let totalCourses = 0
  let totalModules = 0
  let totalLessons = 0

  for (const courseId of TARGET_COURSE_IDS) {
    const courseSnap = await src.collection(COURSES).doc(courseId).get()
    if (!courseSnap.exists) {
      console.warn(`! 見つからないコース: ${courseId}（スキップ）`)
      continue
    }
    const course = courseSnap.data()
    const [mods, lessons] = await Promise.all([
      src.collection(MODULES).where("courseId", "==", courseId).get(),
      src.collection(LESSONS).where("courseId", "==", courseId).get(),
    ])
    console.log(
      `● "${course.title}" (${courseId}) — modules=${mods.size} lessons=${lessons.size}`
    )
    totalCourses++
    totalModules += mods.size
    totalLessons += lessons.size

    if (!EXECUTE) continue

    // Firestore batch は 500 書き込み/バッチ。コース単位で分割コミット。
    let batch = dst.batch()
    let ops = 0
    const commitIfNeeded = async () => {
      if (ops >= 450) {
        await batch.commit()
        batch = dst.batch()
        ops = 0
      }
    }

    batch.set(dst.collection(COURSES).doc(courseId), course)
    ops++
    for (const m of mods.docs) {
      await commitIfNeeded()
      batch.set(dst.collection(MODULES).doc(m.id), m.data())
      ops++
    }
    for (const l of lessons.docs) {
      await commitIfNeeded()
      batch.set(dst.collection(LESSONS).doc(l.id), l.data())
      ops++
    }
    await batch.commit()
    console.log(`   → 移行完了`)
  }

  console.log(`\n=== ${EXECUTE ? "移行結果" : "ドライラン集計"} ===`)
  console.log(`courses=${totalCourses} modules=${totalModules} lessons=${totalLessons}`)
  if (!EXECUTE) {
    console.log("\n本番実行するには: node scripts/migrate-video-courses.cjs --execute")
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("ERROR:", e)
    process.exit(1)
  })
