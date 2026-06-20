const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, doc, setDoc } = require('firebase/firestore');

// Firebase設定（実際の設定に合わせて更新してください）
const firebaseConfig = {
  // あなたのFirebase設定をここに追加
  // 例: my-app/src/lib/firebase.ts から設定をコピー
  apiKey: "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  authDomain: "toefl-writing-reading-b1197.firebaseapp.com",
  projectId: "toefl-writing-reading-b1197",
  storageBucket: "toefl-writing-reading-b1197.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdefghijklmnop"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// IELTS Task1 サンプル問題（グラフ・チャート分析）
const task1Sample = {
  id: "ielts-task1-sample-1",
  title: "IELTS Task 1: 家計所得分布の比較",
  description: "3カ国の家計所得分布を比較分析し、主要な特徴を説明する",
  type: "independent", // 既存のtypeプロパティ
  taskType: "task1",
  content: `The bar chart below shows the percentage of households in different income brackets in three countries (Japan, the United States, and Germany) in 2020.

Income brackets:
- Low income: Less than $30,000 per year
- Middle income: $30,000 - $75,000 per year  
- High income: More than $75,000 per year

Summarize the information by selecting and reporting the main features, and make comparisons where relevant.

Write at least 150 words.`,
  instructions: "グラフの主要な特徴を選択し、報告してください。3カ国間の比較も含めてください。",
  timeLimit: 20,
  wordCount: {
    min: 150,
    target: 200
  },
  category: "Academic Writing",
  difficulty: "中級",
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date()
};

// IELTS Task2 サンプル問題（議論型エッセイ）
const task2Sample = {
  id: "ielts-task2-sample-1",
  title: "IELTS Task 2: 犯罪対策についての議論",
  description: "犯罪削減の最良の方法について両方の見解を議論し、自分の意見を述べる",
  type: "independent", // 既存のtypeプロパティ
  taskType: "task2",
  content: `Some people believe that the best way to reduce crime is to give longer prison sentences. Others believe that there are better alternative ways of reducing crime, such as education and rehabilitation programs.

Discuss both views and give your opinion.

Give reasons for your answer and include any relevant examples from your own knowledge or experience.

Write at least 250 words.`,
  instructions: "両方の見解を議論し、あなたの意見を述べてください。理由と関連する例を含めてください。",
  timeLimit: 40,
  wordCount: {
    min: 250,
    target: 300
  },
  category: "Essay Writing",
  difficulty: "中級",
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date()
};

// IELTS Task1 サンプル問題2（プロセス・フロー）
const task1Sample2 = {
  id: "ielts-task1-sample-2",
  title: "IELTS Task 1: リサイクルプロセスの説明",
  description: "リサイクルプロセスの流れを説明し、各段階の特徴を述べる",
  type: "independent", // 既存のtypeプロパティ
  taskType: "task1",
  content: `The diagram below shows the process of recycling paper and cardboard.

The process includes the following steps:
1. Collection of used paper and cardboard
2. Sorting and separation
3. Cleaning and processing
4. Pulping and refining
5. Paper making
6. Distribution of recycled paper

Describe the process and explain how recycled paper is produced.

Write at least 150 words.`,
  instructions: "プロセスの流れを説明し、リサイクル紙がどのように生産されるかを説明してください。",
  timeLimit: 20,
  wordCount: {
    min: 150,
    target: 200
  },
  category: "Academic Writing",
  difficulty: "初級",
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date()
};

// IELTS Task2 サンプル問題2（問題解決型）
const task2Sample2 = {
  id: "ielts-task2-sample-2",
  title: "IELTS Task 2: 環境問題の解決策",
  description: "環境問題の解決策について議論し、最良のアプローチを提案する",
  type: "independent", // 既存のtypeプロパティ
  taskType: "task2",
  content: `Environmental problems such as climate change and pollution are becoming increasingly serious. Some people believe that individuals should take responsibility for solving these problems, while others think that governments and large corporations should take the lead.

Discuss both views and suggest what you think is the best approach to addressing environmental issues.

Give reasons for your answer and include any relevant examples from your own knowledge or experience.

Write at least 250 words.`,
  instructions: "両方の見解を議論し、環境問題への最良のアプローチを提案してください。理由と例を含めてください。",
  timeLimit: 40,
  wordCount: {
    min: 250,
    target: 300
  },
  category: "Essay Writing",
  difficulty: "上級",
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date()
};

// 問題をFirestoreに追加
async function createIELTSTasks() {
  try {
    console.log('IELTSサンプル問題を作成中...');

    // Task1を追加
    await setDoc(doc(db, 'tasks', task1Sample.id), task1Sample);
    console.log('✅ Task1 サンプル問題1を作成しました:', task1Sample.title);

    await setDoc(doc(db, 'tasks', task1Sample2.id), task1Sample2);
    console.log('✅ Task1 サンプル問題2を作成しました:', task1Sample2.title);

    // Task2を追加
    await setDoc(doc(db, 'tasks', task2Sample.id), task2Sample);
    console.log('✅ Task2 サンプル問題1を作成しました:', task2Sample.title);

    await setDoc(doc(db, 'tasks', task2Sample2.id), task2Sample2);
    console.log('✅ Task2 サンプル問題2を作成しました:', task2Sample2.title);

    console.log('🎉 すべてのIELTSサンプル問題の作成が完了しました！');
    console.log('📊 作成された問題:');
    console.log('   - Task1: 2問（グラフ分析、プロセス説明）');
    console.log('   - Task2: 2問（議論型、問題解決型）');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

// スクリプト実行
createIELTSTasks()
  .then(() => {
    console.log('スクリプトが完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('スクリプトでエラーが発生しました:', error);
    process.exit(1);
  });
