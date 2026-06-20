#!/usr/bin/env node

/**
 * YouTube Transcript API 包括的テストスイート
 * 
 * 使用方法:
 * node scripts/test-suite.js [options]
 * 
 * オプション:
 * --base-url <url>     APIのベースURL (デフォルト: http://localhost:3000)
 * --verbose           詳細ログを表示
 * --quick             クイックテストのみ実行
 * --help              ヘルプを表示
 */

const https = require('https');
const http = require('http');

// 設定
const config = {
  baseUrl: 'http://localhost:3000',
  verbose: false,
  quick: false,
  timeout: 30000
};

// テスト結果
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// コマンドライン引数の解析
function parseArgs() {
  const args = process.argv.slice(2);
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--base-url':
        config.baseUrl = args[++i];
        break;
      case '--verbose':
        config.verbose = true;
        break;
      case '--quick':
        config.quick = true;
        break;
      case '--help':
        console.log(`
YouTube Transcript API テストスイート

使用方法:
  node scripts/test-suite.js [options]

オプション:
  --base-url <url>     APIのベースURL (デフォルト: http://localhost:3000)
  --verbose           詳細ログを表示
  --quick             クイックテストのみ実行
  --help              ヘルプを表示

例:
  node scripts/test-suite.js
  node scripts/test-suite.js --base-url https://api.example.com --verbose
  node scripts/test-suite.js --quick
        `);
        process.exit(0);
        break;
    }
  }
}

// HTTPリクエストを送信する関数
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: response
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(config.timeout, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// テスト実行関数
async function runTest(testName, testFunction) {
  testResults.total++;
  console.log(`\n🧪 テスト: ${testName}`);
  
  try {
    const startTime = Date.now();
    await testFunction();
    const duration = Date.now() - startTime;
    
    testResults.passed++;
    console.log(`✅ 成功: ${testName} (${duration}ms)`);
    
    if (config.verbose) {
      console.log(`   詳細: テストが正常に完了しました`);
    }
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error.message });
    console.log(`❌ 失敗: ${testName}`);
    console.log(`   エラー: ${error.message}`);
    
    if (config.verbose) {
      console.log(`   スタック: ${error.stack}`);
    }
  }
}

// テストケース定義
const testCases = {
  // 基本機能テスト
  async testBasicFunctionality() {
    const response = await makeRequest(`${config.baseUrl}/api/youtube/transcript?videoId=dQw4w9WgXcQ`);
    
    if (response.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
    
    if (!response.body.success) {
      throw new Error(`Expected success: true, got ${response.body.success}`);
    }
    
    if (!response.body.transcript || response.body.transcript.length < 100) {
      throw new Error(`Expected transcript with length > 100, got ${response.body.transcript?.length || 0}`);
    }
    
    if (config.verbose) {
      console.log(`   字幕長: ${response.body.transcript.length}文字`);
      console.log(`   言語: ${response.body.language}`);
      console.log(`   ソース: ${response.body.source}`);
    }
  },

  // キャッシュ機能テスト
  async testCacheFunctionality() {
    // 新しい動画IDを使用してキャッシュテスト
    const testVideoId = 'jNQXAC9IVRw'; // 別の動画ID
    
    // 初回リクエスト（キャッシュミス）
    const firstResponse = await makeRequest(`${config.baseUrl}/api/youtube/transcript?videoId=${testVideoId}`);
    
    if (firstResponse.statusCode !== 200) {
      throw new Error(`First request failed with status ${firstResponse.statusCode}`);
    }
    
    // 初回リクエストはキャッシュミスまたはヒットのどちらでもOK
    const isFirstCached = firstResponse.body.cached === true;
    
    // 2回目リクエスト（キャッシュヒット）
    const secondResponse = await makeRequest(`${config.baseUrl}/api/youtube/transcript?videoId=${testVideoId}`);
    
    if (secondResponse.statusCode !== 200) {
      throw new Error(`Second request failed with status ${secondResponse.statusCode}`);
    }
    
    if (secondResponse.body.cached !== true) {
      throw new Error(`Expected cached: true on second request, got ${secondResponse.body.cached}`);
    }
    
    // 字幕内容が同じであることを確認
    if (firstResponse.body.transcript !== secondResponse.body.transcript) {
      throw new Error('Transcript content differs between cached and non-cached responses');
    }
    
    if (config.verbose) {
      console.log(`   初回リクエスト: cached=${firstResponse.body.cached}`);
      console.log(`   2回目リクエスト: cached=${secondResponse.body.cached}`);
      console.log(`   字幕長: ${firstResponse.body.transcript.length}文字`);
    }
  },

  // エラーハンドリングテスト
  async testErrorHandling() {
    // 無効な動画ID
    const invalidResponse = await makeRequest(`${config.baseUrl}/api/youtube/transcript?videoId=invalid`);
    
    if (invalidResponse.statusCode !== 400) {
      throw new Error(`Expected status 400 for invalid video ID, got ${invalidResponse.statusCode}`);
    }
    
    if (invalidResponse.body.success !== false) {
      throw new Error(`Expected success: false for invalid video ID, got ${invalidResponse.body.success}`);
    }
    
    // 動画IDなし
    const noIdResponse = await makeRequest(`${config.baseUrl}/api/youtube/transcript`);
    
    if (noIdResponse.statusCode !== 200) {
      throw new Error(`Expected status 200 for missing video ID, got ${noIdResponse.statusCode}`);
    }
    
    if (noIdResponse.body.success !== false) {
      throw new Error(`Expected success: false for missing video ID, got ${noIdResponse.body.success}`);
    }
    
    if (config.verbose) {
      console.log(`   無効な動画ID: ${invalidResponse.body.error}`);
      console.log(`   動画IDなし: ${noIdResponse.body.error}`);
    }
  },

  // メトリクスエンドポイントテスト
  async testMetricsEndpoint() {
    const response = await makeRequest(`${config.baseUrl}/api/youtube/transcript?videoId=metrics`);
    
    if (response.statusCode !== 200) {
      throw new Error(`Expected status 200 for metrics endpoint, got ${response.statusCode}`);
    }
    
    if (!response.body.success) {
      throw new Error(`Expected success: true for metrics endpoint, got ${response.body.success}`);
    }
    
    if (!response.body.metrics) {
      throw new Error('Expected metrics object in response');
    }
    
    const metrics = response.body.metrics;
    const requiredFields = ['totalRequests', 'cacheHits', 'cacheMisses', 'errors', 'averageResponseTime'];
    
    for (const field of requiredFields) {
      if (typeof metrics[field] !== 'number') {
        throw new Error(`Expected ${field} to be a number, got ${typeof metrics[field]}`);
      }
    }
    
    if (config.verbose) {
      console.log(`   総リクエスト数: ${metrics.totalRequests}`);
      console.log(`   キャッシュヒット率: ${metrics.cacheHitRate}`);
      console.log(`   エラー率: ${metrics.errorRate}`);
      console.log(`   平均応答時間: ${metrics.averageResponseTime}ms`);
    }
  },

  // ヘルスチェックテスト
  async testHealthCheck() {
    const response = await makeRequest(`${config.baseUrl}/api/youtube/transcript?videoId=health`);
    
    if (response.statusCode !== 200) {
      throw new Error(`Expected status 200 for health check, got ${response.statusCode}`);
    }
    
    if (!response.body.success) {
      throw new Error(`Expected success: true for health check, got ${response.body.success}`);
    }
    
    if (response.body.status !== 'healthy') {
      throw new Error(`Expected status: healthy, got ${response.body.status}`);
    }
    
    if (!response.body.timestamp) {
      throw new Error('Expected timestamp in health check response');
    }
    
    if (config.verbose) {
      console.log(`   ステータス: ${response.body.status}`);
      console.log(`   タイムスタンプ: ${response.body.timestamp}`);
      console.log(`   アップタイム: ${response.body.uptime}秒`);
    }
  },

  // パフォーマンステスト
  async testPerformance() {
    const startTime = Date.now();
    const response = await makeRequest(`${config.baseUrl}/api/youtube/transcript?videoId=dQw4w9WgXcQ`);
    const duration = Date.now() - startTime;
    
    if (response.statusCode !== 200) {
      throw new Error(`Performance test failed with status ${response.statusCode}`);
    }
    
    // キャッシュヒットの場合、応答時間は100ms以下であるべき
    if (response.body.cached && duration > 100) {
      throw new Error(`Cached response took too long: ${duration}ms (expected < 100ms)`);
    }
    
    // 初回リクエストの場合、応答時間は30秒以下であるべき
    if (!response.body.cached && duration > 30000) {
      throw new Error(`Non-cached response took too long: ${duration}ms (expected < 30000ms)`);
    }
    
    if (config.verbose) {
      console.log(`   応答時間: ${duration}ms`);
      console.log(`   キャッシュ: ${response.body.cached ? 'ヒット' : 'ミス'}`);
    }
  },

  // 異なる動画でのテスト
  async testDifferentVideos() {
    const testVideos = [
      'M7lc1UVf-VE', // YouTube Developers Live
      'jNQXAC9IVRw'  // 別の動画
    ];
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const videoId of testVideos) {
      try {
        const response = await makeRequest(`${config.baseUrl}/api/youtube/transcript?videoId=${videoId}`);
        
        if (response.statusCode === 200 && response.body.success) {
          if (response.body.transcript && response.body.transcript.length >= 50) {
            successCount++;
            if (config.verbose) {
              console.log(`   動画 ${videoId}: ${response.body.transcript.length}文字 ✅`);
            }
          } else {
            errorCount++;
            if (config.verbose) {
              console.log(`   動画 ${videoId}: 字幕内容不足 ❌`);
            }
          }
        } else {
          errorCount++;
          if (config.verbose) {
            console.log(`   動画 ${videoId}: エラー (${response.statusCode}) ❌`);
          }
        }
        
        // レート制限を避けるために少し待機
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        errorCount++;
        if (config.verbose) {
          console.log(`   動画 ${videoId}: 例外エラー - ${error.message} ❌`);
        }
      }
    }
    
    // 少なくとも1つの動画が成功すればOK
    if (successCount === 0) {
      throw new Error(`All videos failed. Success: ${successCount}, Errors: ${errorCount}`);
    }
    
    if (config.verbose) {
      console.log(`   成功: ${successCount}, エラー: ${errorCount}`);
    }
  }
};

// メイン実行関数
async function main() {
  console.log('🚀 YouTube Transcript API テストスイート開始');
  console.log(`📡 ベースURL: ${config.baseUrl}`);
  console.log(`⚡ モード: ${config.quick ? 'クイック' : 'フル'}`);
  console.log(`📝 詳細ログ: ${config.verbose ? '有効' : '無効'}`);
  
  const startTime = Date.now();
  
  try {
    // 基本機能テスト
    await runTest('基本機能テスト', testCases.testBasicFunctionality);
    
    // キャッシュ機能テスト
    await runTest('キャッシュ機能テスト', testCases.testCacheFunctionality);
    
    // エラーハンドリングテスト
    await runTest('エラーハンドリングテスト', testCases.testErrorHandling);
    
    // メトリクスエンドポイントテスト
    await runTest('メトリクスエンドポイントテスト', testCases.testMetricsEndpoint);
    
    // ヘルスチェックテスト
    await runTest('ヘルスチェックテスト', testCases.testHealthCheck);
    
    // パフォーマンステスト
    await runTest('パフォーマンステスト', testCases.testPerformance);
    
    // クイックモードでない場合のみ実行
    if (!config.quick) {
      await runTest('異なる動画でのテスト', testCases.testDifferentVideos);
    }
    
  } catch (error) {
    console.error('❌ テストスイート実行中にエラーが発生しました:', error.message);
  }
  
  const totalDuration = Date.now() - startTime;
  
  // 結果サマリー
  console.log('\n📊 テスト結果サマリー');
  console.log('='.repeat(50));
  console.log(`総テスト数: ${testResults.total}`);
  console.log(`成功: ${testResults.passed} ✅`);
  console.log(`失敗: ${testResults.failed} ❌`);
  console.log(`成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  console.log(`実行時間: ${totalDuration}ms`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ 失敗したテスト:');
    testResults.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error.test}: ${error.error}`);
    });
  }
  
  // 終了コード
  const exitCode = testResults.failed > 0 ? 1 : 0;
  console.log(`\n🏁 テストスイート完了 (終了コード: ${exitCode})`);
  process.exit(exitCode);
}

// スクリプト実行
if (require.main === module) {
  parseArgs();
  main().catch(error => {
    console.error('❌ 致命的なエラー:', error);
    process.exit(1);
  });
}

module.exports = { testCases, runTest, makeRequest };
