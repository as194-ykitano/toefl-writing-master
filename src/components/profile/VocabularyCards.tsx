"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserVocabulary, deleteVocabularyItem, updateVocabularyItem } from '@/lib/firebase';
import { VocabularyItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Trash2, Edit, Save, X, Calendar, Tag, Star, SortAsc, SortDesc } from 'lucide-react';
import { useNotification } from '@/contexts/NotificationContext';

type SortType = 'date-desc' | 'date-asc' | 'alphabet-asc' | 'alphabet-desc';
type FilterType = 'all' | 'this-month' | 'last-month';

export default function VocabularyCards() {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    word: string;
    meaning: string;
    tags: string;
  }>({ word: '', meaning: '', tags: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortType, setSortType] = useState<SortType>('date-desc');
  const [filterType, setFilterType] = useState<FilterType>('all');

  useEffect(() => {
    if (user) {
      loadVocabulary();
    }
  }, [user]);

  const loadVocabulary = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const items = await getUserVocabulary(user.uid);
      setVocabulary(items);
    } catch (error) {
      console.error('Error loading vocabulary:', error);
      showNotification('単語・フレーズの読み込みに失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: VocabularyItem) => {
    setEditingId(item.id);
    setEditForm({
      word: item.word,
      meaning: item.meaning || '',
      tags: item.tags?.join(', ') || ''
    });
  };

  const handleSave = async () => {
    if (!user || !editingId) return;

    try {
      const tags = editForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      await updateVocabularyItem(user.uid, editingId, {
        word: editForm.word,
        meaning: editForm.meaning,
        tags
      });

      showNotification('単語・フレーズを更新しました', 'success');
      setEditingId(null);
      loadVocabulary();
    } catch (error) {
      console.error('Error updating vocabulary:', error);
      showNotification('単語・フレーズの更新に失敗しました', 'error');
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!user) return;

    if (!confirm('この単語・フレーズを削除しますか？')) return;

    try {
      await deleteVocabularyItem(user.uid, itemId);
      showNotification('単語・フレーズを削除しました', 'success');
      loadVocabulary();
    } catch (error) {
      console.error('Error deleting vocabulary:', error);
      showNotification('単語・フレーズの削除に失敗しました', 'error');
    }
  };

  const handleReview = async (item: VocabularyItem) => {
    if (!user) return;

    try {
      await updateVocabularyItem(user.uid, item.id, {
        reviewCount: item.reviewCount + 1,
        lastReviewed: new Date()
      });
      showNotification('復習完了！', 'success');
      loadVocabulary();
    } catch (error) {
      console.error('Error updating review:', error);
      showNotification('復習の更新に失敗しました', 'error');
    }
  };

  // フィルター機能
  const filterVocabulary = (items: VocabularyItem[]) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // 今月の開始日と終了日
    const thisMonthStart = new Date(currentYear, currentMonth, 1);
    const thisMonthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
    
    // 先月の開始日と終了日
    const lastMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const lastMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    return items.filter(item => {
      const itemDate = new Date(item.createdAt);
      
      switch (filterType) {
        case 'this-month':
          return itemDate >= thisMonthStart && itemDate <= thisMonthEnd;
        case 'last-month':
          return itemDate >= lastMonthStart && itemDate <= lastMonthEnd;
        case 'all':
        default:
          return true;
      }
    });
  };

  // ソート機能
  const sortVocabulary = (items: VocabularyItem[]) => {
    const sortedItems = [...items];
    
    switch (sortType) {
      case 'date-desc':
        return sortedItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'date-asc':
        return sortedItems.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'alphabet-asc':
        return sortedItems.sort((a, b) => a.word.localeCompare(b.word));
      case 'alphabet-desc':
        return sortedItems.sort((a, b) => b.word.localeCompare(a.word));
      default:
        return sortedItems;
    }
  };

  const filteredVocabulary = sortVocabulary(
    filterVocabulary(
      vocabulary.filter(item => {
        const matchesSearch = item.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.meaning && item.meaning.toLowerCase().includes(searchTerm.toLowerCase()));

        return matchesSearch;
      })
    )
  );

  const getFilterLabel = (filterType: FilterType) => {
    switch (filterType) {
      case 'this-month': return '今月';
      case 'last-month': return '先月';
      case 'all': return '全て';
      default: return '全て';
    }
  };

  void getFilterLabel(filterType);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            単語・フレーズカード
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          単語・フレーズカード ({vocabulary.length}語)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 検索、フィルター、ソート */}
        <div className="space-y-4 mb-6">
          {/* 検索 */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="単語や意味で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
          
          {/* フィルターとソート */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* フィルター */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">期間:</span>
              <Select value={filterType} onValueChange={(value: FilterType) => setFilterType(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全て</SelectItem>
                  <SelectItem value="this-month">今月</SelectItem>
                  <SelectItem value="last-month">先月</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* ソート */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">並び順:</span>
              <Select value={sortType} onValueChange={(value: SortType) => setSortType(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">
                    <div className="flex items-center gap-2">
                      <SortDesc className="h-4 w-4" />
                      新しい順
                    </div>
                  </SelectItem>
                  <SelectItem value="date-asc">
                    <div className="flex items-center gap-2">
                      <SortAsc className="h-4 w-4" />
                      古い順
                    </div>
                  </SelectItem>
                  <SelectItem value="alphabet-asc">
                    <div className="flex items-center gap-2">
                      <SortAsc className="h-4 w-4" />
                      A-Z順
                    </div>
                  </SelectItem>
                  <SelectItem value="alphabet-desc">
                    <div className="flex items-center gap-2">
                      <SortDesc className="h-4 w-4" />
                      Z-A順
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* 単語・フレーズ一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVocabulary.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              {vocabulary.length === 0 ? (
                <div>
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>まだ単語・フレーズが登録されていません</p>
                  <p className="text-sm">エッセイを書いて、テキストを選択して単語・フレーズを追加しましょう！</p>
                </div>
              ) : (
                <p>条件に一致する単語・フレーズが見つかりません</p>
              )}
            </div>
          ) : (
            filteredVocabulary.map((item) => (
              <Card key={item.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  {editingId === item.id ? (
                    // 編集モード
                    <div className="space-y-3">
                      <Input
                        value={editForm.word}
                        onChange={(e) => setEditForm({ ...editForm, word: e.target.value })}
                        placeholder="単語・フレーズ"
                        className="text-sm"
                      />
                      <Input
                        value={editForm.meaning}
                        onChange={(e) => setEditForm({ ...editForm, meaning: e.target.value })}
                        placeholder="意味"
                        className="text-sm"
                      />
                      <Input
                        value={editForm.tags}
                        onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                        placeholder="タグ（カンマ区切り）"
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleSave} size="sm" className="flex-1">
                          <Save className="h-3 w-3 mr-1" />
                          保存
                        </Button>
                        <Button 
                          onClick={() => setEditingId(null)} 
                          variant="outline" 
                          size="sm"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // 表示モード
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-base truncate">{item.word}</h3>
                            {item.reviewCount > 0 && (
                              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                                <Star className="h-3 w-3" />
                                {item.reviewCount}
                              </Badge>
                            )}
                          </div>
                          {item.meaning && (
                            <p className="text-gray-700 text-sm mb-1 line-clamp-2">{item.meaning}</p>
                          )}
                          <p className="text-xs text-gray-500 mb-1 line-clamp-1">{item.context}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {item.createdAt.toLocaleDateString('ja-JP')}
                            </span>
                          </div>
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                              <Tag className="h-3 w-3 text-gray-400" />
                              {item.tags.slice(0, 2).map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {item.tags.length > 2 && (
                                <span className="text-xs text-gray-500">+{item.tags.length - 2}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 ml-2 flex-shrink-0">
                          <Button
                            onClick={() => handleReview(item)}
                            variant="outline"
                            size="sm"
                            className="text-green-600 hover:text-green-700 h-8 w-8 p-0"
                          >
                            <Star className="h-3 w-3" />
                          </Button>
                          <Button
                            onClick={() => handleEdit(item)}
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(item.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
} 
