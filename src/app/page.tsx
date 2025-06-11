import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, BookOpen, BarChart3, Target } from "lucide-react"
import TaskDisplay from '../components/TaskDisplay'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-black rounded-md flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-medium text-gray-900">TOEFL Writing</span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/tasks" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
                演習
              </Link>
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
              >
                ダッシュボード
              </Link>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                  ログイン
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-8 py-24">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold text-gray-900 tracking-tight">
              TOEFL iBT Writing
              <br />
              <span className="text-gray-600">Integrated Task</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              本番と同じ形式で練習し、目標スコアを達成しましょう
            </p>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Link href="/tasks">
              <Button size="lg" className="bg-black hover:bg-gray-700 text-white px-8 h-12 text-base font-medium transition-all hover:scale-105">
                演習を開始
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button
                variant="ghost"
                size="lg"
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-200 px-8 h-12 text-base font-medium transition-all hover:scale-105"
              >
                進捗を確認
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-8 py-16">
        <div className="grid md:grid-cols-3 gap-12">
          <div className="space-y-4 p-6 bg-white rounded-lg border border-gray-200">
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">本格的な演習</h3>
              <p className="text-gray-600 leading-relaxed">
                本番と同じ形式でIntegrated Taskを練習。リーディング・リスニング・ライティングの完全再現。
              </p>
            </div>
          </div>

          <div className="space-y-4 p-6 bg-white rounded-lg border border-gray-200">
            <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">詳細な分析</h3>
              <p className="text-gray-600 leading-relaxed">
                学習履歴とスコアの推移を可視化。弱点を特定し、効率的な学習計画を立てられます。
              </p>
            </div>
          </div>

          <div className="space-y-4 p-6 bg-white rounded-lg border border-gray-200">
            <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">スコア向上</h3>
              <p className="text-gray-600 leading-relaxed">
                AIによる自動フィードバックで改善ポイントを特定。継続的な練習でスコアアップを実現。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="bg-gray-100 py-20">
        <div className="max-w-4xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">演習の流れ</h2>
            <p className="text-gray-600">3つのステップで完了する26分間の演習</p>
          </div>

          <div className="space-y-8">
            <div className="flex items-start gap-6 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
                1
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-gray-900">リーディング（3分）</h3>
                <p className="text-gray-600">パッセージを読解し、要点を把握します。メモを取ることができます。</p>
              </div>
            </div>

            <div className="flex items-start gap-6 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
                2
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-gray-900">リスニング（約2分）</h3>
                <p className="text-gray-600">講義音声を聞いて内容を理解します。一度しか再生されません。</p>
              </div>
            </div>

            <div className="flex items-start gap-6 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="w-8 h-8 bg-gray-700 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
                3
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-gray-900">ライティング（20分）</h3>
                <p className="text-gray-600">両方の内容を統合してエッセイを作成します。目標語数は150-225語です。</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tasks and Reading Passages */}
      <TaskDisplay />

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-8 py-20 text-center">
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-gray-900">今すぐ始めましょう</h2>
          <p className="text-xl text-gray-600">効果的な練習で目標スコアを達成し、理想の未来を手に入れましょう</p>
          <Link href="/tasks">
            <Button size="lg" className="bg-black hover:bg-gray-700 text-white px-12 h-14 text-lg font-medium transition-all hover:scale-105">
              無料で演習を開始
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
