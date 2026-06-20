"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';

interface TextSelectionMenuProps {
  selectedText: string;
  position: { x: number; y: number };
  onAddToVocabulary: (word: string, meaning?: string) => void;
  onClose: () => void;
}

export default function TextSelectionMenu({ 
  selectedText, 
  position, 
  onAddToVocabulary, 
  onClose 
}: TextSelectionMenuProps) {
  const [meaning, setMeaning] = useState<string>('');
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const menuRef = useRef<HTMLDivElement>(null);

  // メニューの位置を画面端で調整する
  useEffect(() => {
    if (menuRef.current) {
      const menu = menuRef.current;
      const menuRect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const menuWidth = menuRect.width;
      
      let newX = position.x;
      
      // モーダル内での位置調整を優先
      const modalContainer = document.querySelector('.task-detail-modal-container');
      if (modalContainer) {
        const modalRect = modalContainer.getBoundingClientRect();
        const modalWidth = modalRect.width;
        const margin = 20;
        
        // モーダル内の右端で見切れる場合
        if (position.x + menuWidth / 2 > modalWidth - margin) {
          newX = modalWidth - menuWidth / 2 - margin;
        }
        
        // モーダル内の左端で見切れる場合
        if (position.x - menuWidth / 2 < margin) {
          newX = menuWidth / 2 + margin;
        }
      } else {
        // モーダル外の場合の通常の調整
        // 右端で見切れる場合
        if (position.x + menuWidth / 2 > viewportWidth - 200) {
          newX = viewportWidth - menuWidth / 2 - 200;
        }
        
        // 左端で見切れる場合
        if (position.x - menuWidth / 2 < 20) {
          newX = menuWidth / 2 + 20;
        }
      }
      
      setAdjustedPosition({
        x: newX,
        y: position.y
      });
    }
  }, [position]);

  // 単語・フレーズに追加
  const handleAddToVocabulary = () => {
    onAddToVocabulary(selectedText, meaning);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="absolute z-[9999] bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[280px] text-selection-menu-container"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        transform: 'translate(-50%, 8px)'
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">選択されたテキスト</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-3">
        <p className="text-sm text-gray-600 mb-1">テキスト:</p>
        <p className="font-medium text-gray-900 bg-gray-50 p-2 rounded">
          &quot;{selectedText}&quot;
        </p>
      </div>

      <div className="space-y-3">
        {/* 意味の手動入力 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            意味
          </label>
          <textarea
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            placeholder="意味を入力してください"
            className="w-full p-2 border border-gray-300 rounded-md text-sm resize-none"
            rows={2}
          />
        </div>

        {/* 単語・フレーズに追加 */}
        <Button
          onClick={handleAddToVocabulary}
          className="w-full"
          variant="default"
        >
          <Plus className="h-4 w-4 mr-2" />
          単語・フレーズに追加
        </Button>
      </div>
    </div>
  );
} 
