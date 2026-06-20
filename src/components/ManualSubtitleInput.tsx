'use client';

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Loader2, Save, AlertCircle, Play, Chrome, Copy, Globe, CheckCircle, AlertTriangle, Video } from 'lucide-react';

interface ManualSubtitleInputProps {
  videoId: string;
  fallbackTranscript: string;
  onTranscriptSaved: (transcript: string) => void;
}

export default function ManualSubtitleInput({ 
  videoId, 
  fallbackTranscript, 
  onTranscriptSaved 
}: ManualSubtitleInputProps) {
  const [manualTranscript, setManualTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [isHowtoOpen, setIsHowtoOpen] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  const handleSave = async () => {
    if (!manualTranscript.trim()) {
      setMessage('字幕を入力してください。');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/youtube/transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId,
          manualTranscript: manualTranscript.trim()
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('手動字幕が保存されました。');
        setMessageType('success');
        onTranscriptSaved(manualTranscript.trim());
      } else {
        setMessage(data.error || '字幕の保存に失敗しました。');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('字幕の保存中にエラーが発生しました。');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          手動字幕入力
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 使い方動画ボタン */}
        <div>
          <Dialog open={isHowtoOpen} onOpenChange={(open) => {
            setIsHowtoOpen(open);
            if (open) {
              setIsVideoLoading(true);
            }
          }}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="inline-flex items-center px-3 py-2 text-sm border border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100 hover:border-orange-400 hover:text-orange-800 hover:scale-105 transition-all duration-200"
              >
                <Play className="h-4 w-4 mr-2" />
                使い方動画を開く
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5 text-blue-500" />
                  使い方動画
                </DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-6">
                {/* 動画 */}
                <div style={{ position: 'relative', paddingBottom: '55.78727841501564%', height: 0 }}>
                  {/* ローディング表示 */}
                  {isVideoLoading && (
                    <div 
                      style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        width: '100%', 
                        height: '100%',
                        backgroundColor: '#f3f4f6',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                        zIndex: 10
                      }}
                    >
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mb-4"></div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Video className="h-5 w-5" />
                        <span className="text-sm font-medium">動画を読み込み中...</span>
                      </div>
                    </div>
                  )}
                  
                  <iframe 
                    src="https://www.loom.com/embed/a83499a8fb85485b9d1670f2033d7e4a?sid=035a70c5-5e83-4b9b-bad5-a6cb47347b5c" 
                    frameBorder="0" 
                    {...({
                      webkitallowfullscreen: "true",
                      mozallowfullscreen: "true"
                    } as any)}
                    allowFullScreen 
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    onLoad={() => setIsVideoLoading(false)}
                    onError={() => setIsVideoLoading(false)}
                  />
                </div>

                {/* マニュアル */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                  <div className="flex items-center gap-2 mb-4">
                        <Chrome className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">YouTube字幕取得マニュアル</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">Chrome拡張機能を使用してYouTube動画の字幕を取得する方法</p>
                    
                    <div className="space-y-4">
                        {/* ステップ1 */}
                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-semibold text-blue-600">1</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-medium text-gray-900 mb-2">Chrome拡張機能の準備</h4>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>• Google Chromeを使用してください（SafariやFirefoxは不可）</li>
                                    <li>• Chrome右上の拡張機能メニューから「拡張機能を管理」を開く</li>
                                    <li>• 「Chromeウェブストア」を開き、「YouTube Summary」などの字幕取得用拡張機能を検索</li>
                                    <li>• 推奨拡張機能（例：YouTube Summary with ChatGPT & Claude）を選び、「Chromeに追加」</li>
                                </ul>
                            </div>
                        </div>

                        {/* ステップ2 */}
                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-semibold text-blue-600">2</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-medium text-gray-900 mb-2">YouTubeで字幕を取得</h4>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>• ChromeブラウザからYouTubeを開く（アプリでは不可）</li>
                                    <li>• 動画ページに「YouTube Summary」のアイコンが表示される</li>
                                    <li>• 右端の「Transcript」ボタンを押すと字幕が表示される</li>
                                    <li>• 「Copy Transcript」ボタンで字幕をコピーできる</li>
                                </ul>
                            </div>
                        </div>

                        {/* ステップ3 */}
                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-semibold text-blue-600">3</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-medium text-gray-900 mb-2">言語切り替え</h4>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>• 動画によっては複数言語の字幕がある</li>
                                    <li>• 字幕一覧を横スクロールし、Englishや希望の言語を選択してからコピーする</li>
                                </ul>
                            </div>
                        </div>

                        {/* ステップ4 */}
                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-semibold text-blue-600">4</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-medium text-gray-900 mb-2">ダッシュボードに貼り付け</h4>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>• コピーした字幕を学習用ダッシュボードに貼り付ける</li>
                                    <li>• 併せて動画のURLもコピー＆ペースト</li>
                                    <li>• 必ず「字幕を保存」ボタンを押す</li>
                                    <li>• 保存後、エッセイまたはサマリーを作成・提出する</li>
                                </ul>
                            </div>
                        </div>

                        {/* 注意点 */}
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-medium text-amber-800 mb-2">注意点</h4>
                                    <ul className="text-sm text-amber-700 space-y-1">
                                        <li>• 字幕が取得できない動画もあるため、最初に確認してから学習に利用する</li>
                                        <li>• 拡張機能は一度入れれば以降は不要</li>
                                        <li>• Chromeブラウザ上なら基本的にどの動画でも字幕取得可能</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 手動字幕入力のみ表示 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            字幕を入力してください:
          </label>
          <Textarea
            value={manualTranscript}
            onChange={(e) => setManualTranscript(e.target.value)}
            placeholder="ここに字幕を貼り付けてください..."
            className="min-h-[200px] resize-y"
          />
        </div>

        {/* メッセージ表示 */}
        {message && (
          <Alert className={messageType === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            <AlertDescription className={messageType === 'error' ? 'text-red-700' : 'text-green-700'}>
              {message}
            </AlertDescription>
          </Alert>
        )}

        {/* 保存ボタン */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={isLoading || !manualTranscript.trim()}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isLoading ? '保存中...' : '字幕を保存'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
