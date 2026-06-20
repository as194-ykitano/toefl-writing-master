import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'crypto';
// Binary-free transcript fallback
import { YoutubeTranscript } from 'youtube-transcript';

const execFileAsync = promisify(execFile);

// キャッシュ設定
const CACHE_DIR = process.env.TRANSCRIPT_CACHE_DIR || (process.platform === 'win32' ? 'C:\\temp\\transcript-cache' : '/tmp/transcript-cache');
const CACHE_TTL = 90 * 60 * 1000; // 90分（ミリ秒）

// ログ設定
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const ENABLE_METRICS = process.env.ENABLE_METRICS === 'true';
const LOG_LEVEL_PRIORITY: Record<string, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

// メトリクス収集
interface Metrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  errors: number;
  averageResponseTime: number;
  lastUpdated: string;
}

const metrics: Metrics = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  errors: 0,
  averageResponseTime: 0,
  lastUpdated: new Date().toISOString()
};

// ログ関数
function log(level: string, message: string, data?: unknown) {
  if ((LOG_LEVEL_PRIORITY[level] ?? 20) < (LOG_LEVEL_PRIORITY[LOG_LEVEL] ?? 20)) {
    return;
  }

  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (data) {
    console.log(logMessage, data);
  } else {
    console.log(logMessage);
  }
}

// メトリクス更新関数
function updateMetrics(responseTime: number, cacheHit: boolean, error: boolean = false) {
  metrics.totalRequests++;
  if (cacheHit) {
    metrics.cacheHits++;
  } else {
    metrics.cacheMisses++;
  }
  if (error) {
    metrics.errors++;
  }
  
  // 平均応答時間を更新
  const totalTime = metrics.averageResponseTime * (metrics.totalRequests - 1) + responseTime;
  metrics.averageResponseTime = totalTime / metrics.totalRequests;
  metrics.lastUpdated = new Date().toISOString();
  
  if (ENABLE_METRICS) {
    log('info', 'Metrics updated', metrics);
  }
}

// VTTファイルを探す関数
async function findVttFiles(directory: string, videoId: string): Promise<string[]> {
  try {
    const files = await fs.promises.readdir(directory);
    return files
      .filter(file => file.includes(videoId) && file.endsWith('.vtt'))
      .map(file => path.join(directory, file));
  } catch (error) {
    console.error('Error finding VTT files:', error);
    return [];
  }
}

// VTTファイルからテキストを抽出する関数
function extractTextFromVtt(vttContent: string): string {
  // VTTファイルの形式を解析してテキストを抽出
  const lines = vttContent.split('\n');
  const textLines: string[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 空行やタイムスタンプ、ヘッダーをスキップ
    if (!trimmedLine || 
        trimmedLine.startsWith('WEBVTT') ||
        trimmedLine.includes('-->') ||
        /^\d+$/.test(trimmedLine)) {
      continue;
    }
    
    // テキスト行を収集
    if (trimmedLine && !trimmedLine.startsWith('NOTE')) {
      textLines.push(trimmedLine);
    }
  }
  
  // テキストを結合してクリーンアップ
  return textLines
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/<[^>]*>/g, '') // HTMLタグを除去
    .trim();
}

// 一時ファイルをクリーンアップする関数
async function cleanupFiles(files: string[]): Promise<void> {
  for (const file of files) {
    try {
      await fs.promises.unlink(file);
      console.log(`Cleaned up file: ${file}`);
    } catch (error) {
      console.error(`Error cleaning up file ${file}:`, error);
    }
  }
}

// 動画IDの形式を検証する関数
function isValidVideoId(videoId: string): boolean {
  // YouTubeの動画IDは通常11文字の英数字とハイフン、アンダースコア
  const youtubeIdRegex = /^[a-zA-Z0-9_-]{11}$/;
  return youtubeIdRegex.test(videoId);
}

// 一時ディレクトリの存在確認と作成
async function ensureTempDir(tempDir: string): Promise<void> {
  try {
    await fs.promises.access(tempDir, fs.constants.W_OK);
  } catch {
    try {
      await fs.promises.mkdir(tempDir, { recursive: true });
      console.log(`Created temp directory: ${tempDir}`);
    } catch {
      throw new Error(`Cannot create or access temp directory: ${tempDir}`);
    }
  }
}

// ファイルサイズをチェックする関数
async function checkFileSize(filePath: string, maxSizeMB: number = 100): Promise<boolean> {
  try {
    const stats = await fs.promises.stat(filePath);
    const sizeMB = stats.size / (1024 * 1024);
    return sizeMB <= maxSizeMB;
  } catch (error) {
    console.error(`Error checking file size for ${filePath}:`, error);
    return false;
  }
}

// キャッシュキーを生成する関数
function generateCacheKey(videoId: string): string {
  return crypto.createHash('md5').update(videoId).digest('hex');
}

// キャッシュファイルのパスを取得する関数
function getCacheFilePath(videoId: string): string {
  const cacheKey = generateCacheKey(videoId);
  return path.join(CACHE_DIR, `${cacheKey}.json`);
}

interface CachedTranscript {
  transcript: string;
  language: string;
  source: string;
}

interface ProxyTranscriptResponse extends Partial<CachedTranscript> {
  success?: boolean;
}

interface TranscriptItem {
  text: string;
}

interface ExecErrorLike {
  code?: string;
  message?: string;
  stderr?: string;
}

function toExecError(error: unknown): ExecErrorLike {
  if (error && typeof error === 'object') {
    const candidate = error as Partial<ExecErrorLike>;
    return {
      code: typeof candidate.code === 'string' ? candidate.code : undefined,
      message: typeof candidate.message === 'string' ? candidate.message : 'Unknown error',
      stderr: typeof candidate.stderr === 'string' ? candidate.stderr : undefined,
    };
  }

  return { message: String(error) };
}

// キャッシュから字幕を取得する関数
async function getCachedTranscript(videoId: string): Promise<CachedTranscript | null> {
  try {
    const cacheFile = getCacheFilePath(videoId);
    const stats = await fs.promises.stat(cacheFile);
    
    // キャッシュの有効期限をチェック
    const now = Date.now();
    const fileTime = stats.mtime.getTime();
    
    if (now - fileTime > CACHE_TTL) {
      console.log(`Cache expired for video ${videoId}, removing...`);
      await fs.promises.unlink(cacheFile);
      return null;
    }
    
    const cachedData = await fs.promises.readFile(cacheFile, 'utf-8');
    const parsed = JSON.parse(cachedData) as CachedTranscript;
    
    console.log(`Cache hit for video ${videoId}`);
    return parsed;
  } catch (error) {
    console.log(`Cache miss for video ${videoId}:`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

// 字幕をキャッシュに保存する関数
async function saveTranscriptToCache(videoId: string, transcript: string, language: string, source: string): Promise<void> {
  try {
    await ensureTempDir(CACHE_DIR);
    
    const cacheData = {
      transcript,
      language,
      source,
      cachedAt: new Date().toISOString(),
      videoId
    };
    
    const cacheFile = getCacheFilePath(videoId);
    await fs.promises.writeFile(cacheFile, JSON.stringify(cacheData, null, 2));
    
    console.log(`Transcript cached for video ${videoId}`);
  } catch (error) {
    console.error(`Error saving cache for video ${videoId}:`, error);
  }
}

// 古いキャッシュファイルをクリーンアップする関数
async function cleanupOldCache(): Promise<void> {
  try {
    const files = await fs.promises.readdir(CACHE_DIR);
    const now = Date.now();
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(CACHE_DIR, file);
        const stats = await fs.promises.stat(filePath);
        
        if (now - stats.mtime.getTime() > CACHE_TTL) {
          await fs.promises.unlink(filePath);
          console.log(`Cleaned up old cache file: ${file}`);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up cache:', error);
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');
  if (!videoId) {
    log('error', 'Missing video ID in request');
    updateMetrics(Date.now() - startTime, false, true);
    return NextResponse.json({
      success: false,
      error: 'Video ID is required'
    });
  }

  // メトリクス表示用のリクエストをチェック
  if (videoId === 'metrics') {
    return NextResponse.json({
      success: true,
      metrics: {
        ...metrics,
        cacheHitRate: metrics.totalRequests > 0 ? (metrics.cacheHits / metrics.totalRequests * 100).toFixed(2) + '%' : '0%',
        errorRate: metrics.totalRequests > 0 ? (metrics.errors / metrics.totalRequests * 100).toFixed(2) + '%' : '0%'
      }
    });
  }

  if (videoId === 'health') {
    return NextResponse.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  }

  // 動画IDの形式を検証
  if (!isValidVideoId(videoId)) {
    log('error', 'Invalid video ID format', { videoId });
    updateMetrics(Date.now() - startTime, false, true);
    return NextResponse.json({
      success: false,
      error: 'Invalid video ID format'
    }, { status: 400 });
  }

  log('info', `Fetching transcript for video ID: ${videoId}`);

  try {
    // 外部トランスクリプトサービス（Cloud Run 等）にプロキシするフラグ
    const externalServiceUrl = process.env.TRANSCRIPT_SERVICE_URL;
    if (externalServiceUrl) {
      try {
        // Try calling with ID token (for private Cloud Run) if available
        const headers: Record<string, string> = {};
        try {
          const target = `${externalServiceUrl.replace(/\/$/, '')}`;
          const tokenRes = await fetch('http://metadata/computeMetadata/v1/instance/service-accounts/default/identity?audience=' + encodeURIComponent(target), {
            headers: { 'Metadata-Flavor': 'Google' }
          });
          if (tokenRes.ok) {
            const idToken = await tokenRes.text();
            headers['Authorization'] = `Bearer ${idToken}`;
          }
        } catch {}

        const proxyRes = await fetch(`${externalServiceUrl.replace(/\/$/, '')}/transcript?videoId=${videoId}`, { method: 'GET', headers });
        const proxyJson = await proxyRes.json().catch(() => ({} as ProxyTranscriptResponse));
        if (proxyRes.ok && proxyJson && proxyJson.transcript) {
          await saveTranscriptToCache(videoId, proxyJson.transcript, proxyJson.language || 'auto', proxyJson.source || 'external');
          updateMetrics(Date.now() - startTime, false, false);
          return NextResponse.json({ success: true, ...proxyJson, cached: false });
        }
        // プロキシ失敗時は通常フローへフォールバック
        console.log('External transcript service failed or returned no transcript, falling back to local logic', { status: proxyRes.status, body: proxyJson });
      } catch (proxyErr) {
        console.log('External transcript service error, falling back to local logic:', proxyErr instanceof Error ? proxyErr.message : proxyErr);
      }
    }

    // まずキャッシュをチェック
    const cachedTranscript = await getCachedTranscript(videoId);
    if (cachedTranscript) {
      log('info', `Cache hit for video ${videoId}`, { 
        transcriptLength: cachedTranscript.transcript.length,
        language: cachedTranscript.language 
      });
      updateMetrics(Date.now() - startTime, true, false);
      return NextResponse.json({
        success: true,
        transcript: cachedTranscript.transcript,
        language: cachedTranscript.language,
        source: cachedTranscript.source,
        cached: true
      });
    }

    // 古いキャッシュをクリーンアップ（非同期で実行）
    cleanupOldCache().catch(error => console.error('Cache cleanup error:', error));

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // 1) まずはバイナリ不要の `youtube-transcript` を試す（本番環境での安定動作を優先）
    try {
      const tryFetch = async (opts?: { lang?: string }) => {
        try {
          return await YoutubeTranscript.fetchTranscript(videoId, opts);
        } catch {
          return [] as TranscriptItem[];
        }
      };

      // 言語未指定 → en → en-US → en-GB の順に試行
      const candidates = [
        await tryFetch(),
        await tryFetch({ lang: 'en' }),
        await tryFetch({ lang: 'en-US' }),
        await tryFetch({ lang: 'en-GB' })
      ];

      const items = candidates.find(arr => Array.isArray(arr) && arr.length > 0) || [];
      if (items.length > 0) {
        const transcriptText = items.map(item => item.text).join(' ').replace(/\s+/g, ' ').trim();
        if (transcriptText && transcriptText.length >= 50) {
          await saveTranscriptToCache(videoId, transcriptText, 'auto', 'youtube-transcript');
          updateMetrics(Date.now() - startTime, false, false);
          return NextResponse.json({
            success: true,
            transcript: transcriptText,
            language: 'auto',
            source: 'youtube-transcript',
            cached: false
          });
        }
      }
    } catch (ytLibErr) {
      console.log('youtube-transcript fallback failed or unavailable, will try yt-dlp next:', ytLibErr instanceof Error ? ytLibErr.message : ytLibErr);
    }
    const isWindows = process.platform === 'win32';
    const tempDir = process.env.YT_DLP_TEMP_DIR || (isWindows ? 'C:\\temp' : '/tmp');
    const execTimeout = parseInt(process.env.YT_DLP_TIMEOUT || '60000');
    const outputPattern = path.join(tempDir, `${videoId}.%(ext)s`);

    // 一時ディレクトリの存在確認
    await ensureTempDir(tempDir);

    // 2) ライブラリで取得できない場合は yt-dlp を試す
    // yt-dlpコマンドの引数（字幕取得に特化）
    const args = [
      '--write-subs',           // 字幕を書き込み
      '--write-auto-subs',      // 自動生成字幕も書き込み
      '--sub-langs', 'en',      // 英語のみ
      '--skip-download',        // 動画本体はダウンロードしない
      '--convert-subs', 'vtt',   // 字幕をVTT形式に変換
      '--output', outputPattern, // 出力ファイル名パターン
      '--no-warnings',          // 警告を非表示
      '--ignore-errors',        // エラーを無視して続行
      '--no-check-certificate', // 証明書チェックを無効化
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', // ユーザーエージェントを設定
      '--extractor-args', 'youtube:player_client=web;player_skip=webpage', // YouTubeのWebクライアントを使用
      videoUrl
    ];

    console.log('Running yt-dlp with args:', args);

    try {
      // yt-dlpを実行（Windows環境ではpython -m yt_dlpを使用）
      const command = isWindows ? 'python' : 'yt-dlp';
      const commandArgs = isWindows ? ['-m', 'yt_dlp', ...args] : args;
      
      console.log(`Executing: ${command} ${commandArgs.join(' ')}`);
      
      const { stdout, stderr } = await execFileAsync(command, commandArgs, {
        cwd: tempDir,
        timeout: execTimeout
      });

      console.log('yt-dlp stdout:', stdout);
      if (stderr) {
        console.log('yt-dlp stderr:', stderr);
      }

      // 生成されたVTTファイルを探す
      const vttFiles = await findVttFiles(tempDir, videoId);
      console.log('Found VTT files:', vttFiles);

      if (vttFiles.length === 0) {
        console.log('No VTT files found, attempting fallback');
        
        // フォールバック: 動画のメタデータを取得
        try {
          const fallbackArgs = [
            '--skip-download',
            '--get-title',
            '--get-description',
            '--no-warnings',
            videoUrl
          ];
          
          const { stdout: fallbackStdout } = await execFileAsync(command, 
            isWindows ? ['-m', 'yt_dlp', ...fallbackArgs] : fallbackArgs, {
            cwd: tempDir,
            timeout: 30000
          });
          
          const lines = fallbackStdout.split('\n');
          const title = lines[0] || 'No title available';
          const description = lines.slice(1).join(' ').substring(0, 1000) || 'No description available';
          
          const fallbackTranscript = `${title}\n\n${description}`;
          
          // フォールバック字幕をキャッシュに保存
          await saveTranscriptToCache(videoId, fallbackTranscript, 'fallback', 'metadata');
          
          return NextResponse.json({
            success: true,
            transcript: fallbackTranscript,
            language: 'fallback',
            source: 'metadata',
            cached: false,
            warning: 'Using video metadata as fallback transcript'
          });
        } catch (fallbackError) {
          console.log('Fallback also failed:', fallbackError);
        }
        
        return NextResponse.json({
          success: false,
          error: 'No subtitles available for this video',
          message: 'This video may not have captions available'
        });
      }

      // 最初のVTTファイルを読み込む
      const vttFile = vttFiles[0];
      
      // ファイルサイズをチェック
      const maxSizeMB = parseInt(process.env.YT_DLP_MAX_FILESIZE || '100');
      if (!(await checkFileSize(vttFile, maxSizeMB))) {
        console.log(`VTT file too large: ${vttFile}`);
        await cleanupFiles(vttFiles);
        return NextResponse.json({
          success: false,
          error: 'Subtitle file too large',
          message: `Subtitle file exceeds ${maxSizeMB}MB limit`
        }, { status: 413 });
      }

      const vttContent = await fs.promises.readFile(vttFile, 'utf-8');
      console.log('VTT content length:', vttContent.length);

      // VTTファイルからテキストを抽出
      const transcriptText = extractTextFromVtt(vttContent);
      console.log('Extracted transcript length:', transcriptText.length);

      if (transcriptText.length < 50) {
        console.log('Extracted text is too short');
        await cleanupFiles(vttFiles);
        return NextResponse.json({
          success: false,
          error: 'No valid transcript found',
          message: 'The extracted transcript is too short or empty'
        });
      }

      // ファイルをクリーンアップ
      await cleanupFiles(vttFiles);

      // 字幕をキャッシュに保存
      await saveTranscriptToCache(videoId, transcriptText, 'auto', 'yt-dlp');

      log('info', `Transcript successfully extracted`, { 
        videoId, 
        transcriptLength: transcriptText.length,
        responseTime: Date.now() - startTime 
      });
      
      updateMetrics(Date.now() - startTime, false, false);
      return NextResponse.json({
        success: true,
        transcript: transcriptText,
        language: 'auto',
        source: 'yt-dlp',
        cached: false
      });

    } catch (execError) {
      const normalizedError = toExecError(execError);
      log('error', 'yt-dlp execution error', { 
        videoId, 
        error: normalizedError.message,
        responseTime: Date.now() - startTime 
      });
      
      // 一時ファイルをクリーンアップ
      try {
        const vttFiles = await findVttFiles(tempDir, videoId);
        await cleanupFiles(vttFiles);
      } catch (cleanupError) {
        log('error', 'Error during cleanup', cleanupError);
      }
      
      // yt-dlpがインストールされていない場合のエラーハンドリング
      if (normalizedError.code === 'ENOENT') {
        updateMetrics(Date.now() - startTime, false, true);
        return NextResponse.json({
          success: false,
          error: 'yt-dlp not found',
          message: 'yt-dlp is not installed on the server. Please install yt-dlp to use this feature.',
          details: 'Install yt-dlp: pip install yt-dlp or brew install yt-dlp',
          note: 'In production, we recommend relying on the youtube-transcript library path instead of yt-dlp.'
        }, { status: 500 });
      }

      // タイムアウトエラー
      if (normalizedError.code === 'TIMEOUT') {
        updateMetrics(Date.now() - startTime, false, true);
        return NextResponse.json({
          success: false,
          error: 'Request timeout',
          message: 'The video processing took too long. Please try again.',
          details: normalizedError.message
        }, { status: 408 });
      }

      // 権限エラー
      if (normalizedError.code === 'EACCES' || normalizedError.code === 'EPERM') {
        updateMetrics(Date.now() - startTime, false, true);
        return NextResponse.json({
          success: false,
          error: 'Permission denied',
          message: 'Insufficient permissions to execute yt-dlp or access temp directory',
          details: normalizedError.message
        }, { status: 500 });
      }

      // 動画が見つからない場合
      if (normalizedError.stderr && normalizedError.stderr.includes('Video unavailable')) {
        updateMetrics(Date.now() - startTime, false, true);
        return NextResponse.json({
          success: false,
          error: 'Video unavailable',
          message: 'The requested video is not available or has been removed',
          details: normalizedError.stderr
        }, { status: 404 });
      }

      // フォーマット関連のエラー - フォールバックを試行
      if (normalizedError.stderr && normalizedError.stderr.includes('Requested format is not available')) {
        console.log('Format error detected, attempting fallback...');
        
        try {
          // フォールバック: より基本的な字幕取得を試行
          const fallbackArgs = [
            '--write-subs',
            '--write-auto-subs',
            '--sub-langs', 'en',
            '--skip-download',
            '--convert-subs', 'vtt',
            '--output', outputPattern,
            '--no-warnings',
            '--ignore-errors',
            '--no-check-certificate',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            '--extractor-args', 'youtube:player_client=android', // Androidクライアントを使用
            videoUrl
          ];
          
          const { stdout: fallbackStdout, stderr: fallbackStderr } = await execFileAsync(isWindows ? 'python' : 'yt-dlp', 
            isWindows ? ['-m', 'yt_dlp', ...fallbackArgs] : fallbackArgs, {
            cwd: tempDir,
            timeout: 30000
          });
          
          console.log('Fallback yt-dlp stdout:', fallbackStdout);
          if (fallbackStderr) {
            console.log('Fallback yt-dlp stderr:', fallbackStderr);
          }
          
          // フォールバックで生成されたVTTファイルを探す
          const fallbackVttFiles = await findVttFiles(tempDir, videoId);
          console.log('Found fallback VTT files:', fallbackVttFiles);
          
          if (fallbackVttFiles.length > 0) {
            // フォールバックで字幕が取得できた場合
            const fallbackVttFile = fallbackVttFiles[0];
            const fallbackVttContent = await fs.promises.readFile(fallbackVttFile, 'utf-8');
            const fallbackTranscript = extractTextFromVtt(fallbackVttContent);
            
            // ファイルをクリーンアップ
            await cleanupFiles(fallbackVttFiles);
            
            // フォールバック字幕をキャッシュに保存
            await saveTranscriptToCache(videoId, fallbackTranscript, 'auto', 'yt-dlp-fallback');
            
            log('info', `Fallback transcript successfully extracted`, { 
              videoId, 
              transcriptLength: fallbackTranscript.length,
              responseTime: Date.now() - startTime 
            });
            
            updateMetrics(Date.now() - startTime, false, false);
            return NextResponse.json({
              success: true,
              transcript: fallbackTranscript,
              language: 'auto',
              source: 'yt-dlp-fallback',
              cached: false
            });
          } else {
            // フォールバックでも字幕が取得できない場合、メタデータを使用
            const lines = fallbackStdout.split('\n');
            const title = lines[0] || 'No title available';
            const description = lines.slice(1).join(' ').substring(0, 1000) || 'No description available';
            
            const fallbackTranscript = `${title}\n\n${description}`;
            
            // フォールバック字幕をキャッシュに保存
            await saveTranscriptToCache(videoId, fallbackTranscript, 'fallback', 'metadata');
            
            log('info', `Fallback transcript used for video ${videoId}`, { 
              transcriptLength: fallbackTranscript.length,
              responseTime: Date.now() - startTime 
            });
            
            updateMetrics(Date.now() - startTime, false, false);
            return NextResponse.json({
              success: true,
              transcript: fallbackTranscript,
              language: 'fallback',
              source: 'metadata',
              cached: false,
              warning: 'Using video metadata as fallback transcript due to format restrictions',
              manualInputRequired: true,
              message: '字幕の自動取得に失敗しました。手動で字幕を入力してください。'
            });
          }
        } catch (fallbackError) {
          console.log('Fallback also failed:', fallbackError);
          
          // 最終フォールバック: YouTube Data API v3を使用
          try {
            const apiKey = process.env.YOUTUBE_API_KEY;
            if (apiKey) {
              const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`);
              const data = await response.json();
              
              if (data.items && data.items.length > 0) {
                const video = data.items[0];
                const title = video.snippet.title || 'No title available';
                const description = video.snippet.description || 'No description available';
                
                const apiFallbackTranscript = `${title}\n\n${description}`;
                
                // APIフォールバック字幕をキャッシュに保存
                await saveTranscriptToCache(videoId, apiFallbackTranscript, 'api-fallback', 'youtube-api');
                
                log('info', `API fallback transcript used for video ${videoId}`, { 
                  transcriptLength: apiFallbackTranscript.length,
                  responseTime: Date.now() - startTime 
                });
                
                updateMetrics(Date.now() - startTime, false, false);
                return NextResponse.json({
                  success: true,
                  transcript: apiFallbackTranscript,
                  language: 'api-fallback',
                  source: 'youtube-api',
                  cached: false,
                  warning: 'Using YouTube API as final fallback due to yt-dlp format restrictions',
                  manualInputRequired: true,
                  message: '字幕の自動取得に失敗しました。手動で字幕を入力してください。'
                });
              }
            }
          } catch (apiError) {
            console.log('YouTube API fallback also failed:', apiError);
          }
        }
        
        updateMetrics(Date.now() - startTime, false, true);
        return NextResponse.json({
          success: false,
          error: 'Format not available',
          message: 'The requested video format is not available. This may be due to regional restrictions or video availability.',
          details: normalizedError.stderr,
          suggestion: 'Try using a different video or check if the video is available in your region'
        }, { status: 400 });
      }

      // その他のエラー
      updateMetrics(Date.now() - startTime, false, true);
      return NextResponse.json({
        success: false,
        error: 'yt-dlp execution failed',
        message: 'Failed to extract subtitles using yt-dlp',
        details: normalizedError.message,
        stderr: normalizedError.stderr
      }, { status: 500 });
    }

  } catch (error) {
    log('error', 'Transcript fetch error', { 
      videoId, 
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime 
    });
    updateMetrics(Date.now() - startTime, false, true);
    return NextResponse.json({
      success: false,
      error: 'Failed to get transcript',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, manualTranscript } = body;

    if (!videoId) {
      return NextResponse.json({
        success: false,
        error: 'Video ID is required'
      }, { status: 400 });
    }

    if (!manualTranscript) {
      return NextResponse.json({
        success: false,
        error: 'Manual transcript is required'
      }, { status: 400 });
    }

    log('info', `POST: Manual transcript for video ID: ${videoId}`);

    // 手動字幕をキャッシュに保存
    await saveTranscriptToCache(videoId, manualTranscript, 'manual', 'user-input');

    return NextResponse.json({
      success: true,
      transcript: manualTranscript,
      language: 'manual',
      source: 'user-input',
      cached: true,
      message: '手動字幕が保存されました。'
    });
  } catch (error) {
    log('error', 'POST manual transcript error', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to save manual transcript',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
