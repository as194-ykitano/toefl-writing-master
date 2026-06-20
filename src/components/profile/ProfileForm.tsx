import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserProfile, uploadProfileImage, getUserProfile } from '@/lib/firebase';
import { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import Image from 'next/image';

type ErrorWithMessage = { message?: string };

export default function ProfileForm() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user profile
  useEffect(() => {
    if (user) {
      getUserProfile(user.uid).then(setProfile);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await updateUserProfile(user.uid, {
        displayName: profile.displayName,
      });
      setSuccess('プロフィールを更新しました');
    } catch (error) {
      setError((error as ErrorWithMessage).message || 'プロフィール更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const file = e.target.files[0];
      const photoURL = await uploadProfileImage(user.uid, file);
      setProfile(prev => prev ? { ...prev, photoURL } : null);
      setSuccess('プロフィール画像を更新しました');
    } catch (error) {
      setError((error as ErrorWithMessage).message || '画像アップロードに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return <div>Loading...</div>;
  }

  return (
    <Card className="w-full max-w-2xl p-6">
      <h2 className="text-2xl font-bold mb-6">プロフィール設定</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Image */}
        <div className="flex items-center space-x-4">
          <div className="relative w-24 h-24 rounded-full overflow-hidden">
            {profile.photoURL ? (
              <Image
                src={profile.photoURL}
                alt="Profile"
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-2xl text-gray-500">
                  {profile.displayName?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
            )}
          </div>
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              画像を変更
            </Button>
          </div>
        </div>

        {/* Display Name */}
        <div className="space-y-2">
          <Label htmlFor="displayName">表示名</Label>
          <Input
            id="displayName"
            value={profile.displayName}
            onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
            required
          />
        </div>

        {/* Email (read-only) */}
        <div className="space-y-2">
          <Label htmlFor="email">メールアドレス</Label>
          <Input
            id="email"
            value={profile.email}
            disabled
            className="bg-gray-50"
          />
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        {success && (
          <div className="text-green-500 text-sm">{success}</div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? '更新中...' : 'プロフィールを更新'}
        </Button>
      </form>
    </Card>
  );
} 
