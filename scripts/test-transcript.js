#!/usr/bin/env node

/**
 * YouTube Transcript API テストスクリプト
 * 
 * 使用方法:
 * node scripts/test-transcript.js <videoId>
 * 
 * 例:
 * node scripts/test-transcript.js dQw4w9WgXcQ
 */

const https = require('https');
const http = require('http');

const videoId = process.argv[2];

if (!videoId) {
  console.error('使用方法: node scripts/test-transcript.js <videoId>');
  console.error('例: node scripts/test-transcript.js dQw4w9WgXcQ');
  process.exit(1);
}

// テスト用の動画ID（Rick Astley - Never Gonna Give You Up）
const testVideoId = videoId || 'dQw4w9WgXcQ';

console.log(`Testing transcript API with video ID: ${testVideoId}`);

// ローカルサーバーのURL（開発環境用）
const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
const apiUrl = `${baseUrl}/api/youtube/transcript?videoId=${testVideoId}`;

console.log(`API URL: ${apiUrl}`);

// HTTPリクエストを送信
const protocol = baseUrl.startsWith('https') ? https : http;

const req = protocol.get(apiUrl, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      console.log('\n=== レスポンス ===');
      console.log('ステータス:', res.statusCode);
      console.log('成功:', response.success);
      
      if (response.success) {
        console.log('言語:', response.language);
        console.log('ソース:', response.source);
        console.log('文字数:', response.transcript ? response.transcript.length : 0);
        console.log('\n=== 字幕テキスト（最初の500文字）===');
        console.log(response.transcript ? response.transcript.substring(0, 500) + '...' : 'なし');
      } else {
        console.log('エラー:', response.error);
        console.log('メッセージ:', response.message);
        if (response.details) {
          console.log('詳細:', response.details);
        }
      }
      
      console.log('\n=== 完全なレスポンス ===');
      console.log(JSON.stringify(response, null, 2));
      
    } catch (error) {
      console.error('JSON解析エラー:', error.message);
      console.log('生レスポンス:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('リクエストエラー:', error.message);
  
  if (error.code === 'ECONNREFUSED') {
    console.error('\nサーバーに接続できません。以下を確認してください:');
    console.error('1. サーバーが起動しているか');
    console.error('2. ポート番号が正しいか');
    console.error('3. API_BASE_URLが正しく設定されているか');
  }
});

req.setTimeout(35000, () => {
  console.error('リクエストがタイムアウトしました（35秒）');
  req.destroy();
});

console.log('リクエストを送信中...');
