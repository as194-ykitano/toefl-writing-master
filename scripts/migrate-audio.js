const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Firebase設定（環境変数から取得）
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const db = getFirestore(app);

async function migrateAudioFiles() {
  try {
    console.log('音声ファイルの移行を開始します...');
    
    // すべてのタスクを取得
    const tasksSnapshot = await getDocs(collection(db, 'tasks'));
    const tasks = tasksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`取得したタスク数: ${tasks.length}`);
    
    for (const task of tasks) {
      console.log(`\nタスク "${task.title}" (ID: ${task.id}) を処理中...`);
      
      // 現在のlisteningAudioURLを確認
      if (task.listeningAudioURL && task.listeningAudioURL.startsWith('/audio/')) {
        console.log(`ローカルパスを検出: ${task.listeningAudioURL}`);
        
        // ファイル名を抽出
        const fileName = task.listeningAudioURL.split('/').pop();
        const localFilePath = path.join(__dirname, '..', 'public', task.listeningAudioURL);
        
        // ローカルファイルの存在確認
        if (fs.existsSync(localFilePath)) {
          console.log(`ローカルファイルが見つかりました: ${localFilePath}`);
          
          try {
            // ファイルを読み込み
            const fileBuffer = fs.readFileSync(localFilePath);
            
            // Storageにアップロード
            const audioRef = ref(storage, `audio/${task.id}/${fileName}`);
            console.log(`Storageにアップロード中: audio/${task.id}/${fileName}`);
            
            const snapshot = await uploadBytes(audioRef, fileBuffer);
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            console.log(`アップロード完了: ${downloadURL}`);
            
            // タスクのlisteningAudioURLを更新
            const taskRef = doc(db, 'tasks', task.id);
            await updateDoc(taskRef, {
              listeningAudioURL: downloadURL
            });
            
            console.log(`タスク ${task.id} の音声URLを更新しました`);
            
          } catch (error) {
            console.error(`タスク ${task.id} の処理中にエラーが発生:`, error);
          }
        } else {
          console.log(`ローカルファイルが見つかりません: ${localFilePath}`);
        }
      } else if (task.listeningAudioURL && task.listeningAudioURL.startsWith('https://')) {
        console.log(`既にStorage URLが設定されています: ${task.listeningAudioURL}`);
      } else {
        console.log(`音声URLが設定されていません: ${task.listeningAudioURL}`);
      }
    }
    
    console.log('\n音声ファイルの移行処理が完了しました。');
  } catch (error) {
    console.error('音声ファイルの移行中にエラーが発生:', error);
  }
}

// スクリプト実行
if (require.main === module) {
  migrateAudioFiles();
}

module.exports = { migrateAudioFiles }; 