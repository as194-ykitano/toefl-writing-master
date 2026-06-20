import { getTasks, uploadAudioFile, updateTaskAudioURL } from './firebase';
import { Task } from './types';

// 既存のローカル音声ファイルをStorageに移行する関数
export async function migrateAudioToStorage() {
  try {
    console.log('音声ファイルの移行を開始します...');
    
    // すべてのタスクを取得
    const tasks = await getTasks();
    console.log(`取得したタスク数: ${tasks.length}`);
    
    for (const task of tasks) {
      console.log(`タスク "${task.title}" (ID: ${task.id}) を処理中...`);
      
      // 現在のlisteningAudioURLを確認
      if (task.listeningAudioURL && task.listeningAudioURL.startsWith('/audio/')) {
        console.log(`ローカルパスを検出: ${task.listeningAudioURL}`);
        
        try {
          // ローカルファイルを取得（実際の実装では、ファイルを直接取得する必要があります）
          // ここでは例として、task-1-lecture.mp3を想定
          const fileName = task.listeningAudioURL.split('/').pop();
          if (fileName) {
            console.log(`ファイル名: ${fileName}`);
            
            // 実際の実装では、ローカルファイルをFileオブジェクトとして取得する必要があります
            // この例では、既存のファイルをコピーしてアップロードすることを想定
            console.log(`注意: 実際のファイルアップロードは手動で行う必要があります`);
            console.log(`ファイルパス: public${task.listeningAudioURL}`);
            console.log(`Storageパス: audio/${task.id}/${fileName}`);
          }
        } catch (error) {
          console.error(`タスク ${task.id} の処理中にエラーが発生:`, error);
        }
      } else if (task.listeningAudioURL && task.listeningAudioURL.startsWith('https://')) {
        console.log(`既にStorage URLが設定されています: ${task.listeningAudioURL}`);
      } else {
        console.log(`音声URLが設定されていません: ${task.listeningAudioURL}`);
      }
    }
    
    console.log('音声ファイルの移行処理が完了しました。');
  } catch (error) {
    console.error('音声ファイルの移行中にエラーが発生:', error);
  }
}

// 特定のタスクの音声ファイルを手動でアップロードする関数
export async function uploadTaskAudio(taskId: string, file: File): Promise<void> {
  try {
    console.log(`タスク ${taskId} の音声ファイルをアップロード中...`);
    
    // 音声ファイルをStorageにアップロード
    const audioURL = await uploadAudioFile(file, taskId);
    console.log(`アップロード完了: ${audioURL}`);
    
    // タスクのlisteningAudioURLを更新
    await updateTaskAudioURL(taskId, audioURL);
    console.log(`タスク ${taskId} の音声URLを更新しました`);
    
  } catch (error) {
    console.error(`タスク ${taskId} の音声ファイルアップロード中にエラーが発生:`, error);
    throw error;
  }
}

// タスクの音声URLを手動で更新する関数
export async function updateTaskAudioURLManually(taskId: string, audioURL: string): Promise<void> {
  try {
    console.log(`タスク ${taskId} の音声URLを手動で更新中...`);
    await updateTaskAudioURL(taskId, audioURL);
    console.log(`タスク ${taskId} の音声URLを更新しました: ${audioURL}`);
  } catch (error) {
    console.error(`タスク ${taskId} の音声URL更新中にエラーが発生:`, error);
    throw error;
  }
} 