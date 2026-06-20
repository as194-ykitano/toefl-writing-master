"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"

interface ListeningScreenProps {
  imageURL?: string
  audioURL: string
  onComplete: () => void
}

export default function ListeningScreen({ imageURL, audioURL, onComplete }: ListeningScreenProps) {
  console.log('ListeningScreen props:', { imageURL, audioURL });
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    console.log('Attempting to load audio from:', audioURL);
    console.log('Audio element state:', {
      readyState: audio.readyState,
      networkState: audio.networkState,
      src: audio.src,
      currentSrc: audio.currentSrc
    });
    
    const handleLoadedMetadata = () => {
      console.log('Audio loaded successfully:', {
        duration: audio.duration,
        readyState: audio.readyState,
        networkState: audio.networkState,
        src: audio.src,
        currentSrc: audio.currentSrc,
        audioElement: audio
      });
      setDuration(audio.duration);
      setError(null);
      // Auto-play when audio is loaded
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          // setIsPlaying(true);
        }).catch((error) => {
          console.error('Auto-play failed:', error);
          setError('音声の再生に失敗しました。ブラウザの設定を確認してください。');
        });
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setCurrentTime(audio.duration);
      onComplete();
    };

    const handleError = (e: Event) => {
      const audioElement = e.target as HTMLAudioElement;
      const error = audioElement.error;
      
      console.error('Audio loading error:', {
        error,
        errorCode: error?.code,
        errorMessage: error?.message,
        audioURL,
        audioElement: {
          readyState: audioElement.readyState,
          networkState: audioElement.networkState,
          src: audioElement.src,
          error: audioElement.error,
          currentSrc: audioElement.currentSrc,
          audioElement: audioElement
        }
      });
      
      let errorMessage = '音声の読み込みに失敗しました。';
      if (error) {
        switch (error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = '音声の読み込みが中断されました。';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'ネットワークエラーが発生しました。';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = '音声ファイルの形式が正しくありません。';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = '音声ファイルの形式がサポートされていません。';
            break;
        }
      }
      setError(errorMessage);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [audioURL, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">リスニング</h2>
        
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
            <p className="text-sm text-red-500 mt-2">
              音声ファイルのパス: {audioURL}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {imageURL && (
              <div className="relative w-full aspect-video mb-6">
                <Image
                  src={imageURL}
                  alt="Lecture image"
                  fill
                  className="object-contain rounded-lg"
                  priority
                  onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                    console.error('Image loading error:', {
                      imageURL,
                      error: e,
                      target: e.target
                    });
                    const container = e.currentTarget.parentElement;
                    if (container) {
                      container.innerHTML = '<div class="flex items-center justify-center w-full h-full bg-gray-100 text-gray-500 text-xl font-bold">image</div>';
                    }
                  }}
                  onLoad={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                    const img = e.target as HTMLImageElement;
                    console.log('Image loaded successfully:', {
                      imageURL,
                      naturalWidth: img.naturalWidth,
                      naturalHeight: img.naturalHeight
                    });
                  }}
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex-1 mx-4">
                <div className="h-2 bg-gray-200 rounded-full">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-100"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <audio
          ref={audioRef}
          src={audioURL}
          preload="auto"
          crossOrigin="anonymous"
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}
