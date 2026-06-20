import { useState } from 'react';
import { signIn, createUserProfile } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isAdmin } from '@/lib/utils';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await signIn(email, password);
      if (user) {
        await createUserProfile(user);
        // 管理者かどうかをチェックして適切なダッシュボードにリダイレクト
        if (isAdmin(user.email)) {
          router.push('/admin/dashboard');
        } else {
          // ユーザーネームが未設定の場合は設定ページに遷移
          if (!user.displayName || user.displayName.trim() === '') {
            router.push('/user-name-setup');
          } else {
            router.push('/training-selection');
          }
        }
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">ログイン</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">メールアドレス</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="example@email.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">パスワード</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? '処理中...' : 'ログイン'}
        </Button>

        <div className="text-center">
          <Link
            href="/reset-password"
            className="text-sm text-blue-600 hover:underline block w-full"
          >
            パスワードをお忘れの方はこちら
          </Link>
        </div>
      </form>
    </Card>
  );
} 