import { Essay } from "@/lib/firebase"
import { Card } from "@/components/ui/card"

interface EssayFeedbackProps {
  essay: Essay
}

export default function EssayFeedback({ essay }: EssayFeedbackProps) {
  if (!essay.feedback) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* 全体評価 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">全体評価</h3>
        <p className="text-gray-700">{essay.feedback.overall}</p>
      </Card>

      {/* スコア */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">詳細スコア</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Integration</p>
            <p className="text-2xl font-bold">{essay.feedback.detailedScores.integration}/5</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Organization</p>
            <p className="text-2xl font-bold">{essay.feedback.detailedScores.organization}/5</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Language</p>
            <p className="text-2xl font-bold">{essay.feedback.detailedScores.language}/5</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Development</p>
            <p className="text-2xl font-bold">{essay.feedback.detailedScores.development}/5</p>
          </div>
        </div>
      </Card>

      {/* 長所 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">長所</h3>
        <ul className="list-disc list-inside space-y-2">
          {essay.feedback.strengths.map((strength, index) => (
            <li key={index} className="text-gray-700">{strength}</li>
          ))}
        </ul>
      </Card>

      {/* 改善点 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">改善点</h3>
        <ul className="list-disc list-inside space-y-2">
          {essay.feedback.improvements.map((improvement, index) => (
            <li key={index} className="text-gray-700">{improvement}</li>
          ))}
        </ul>
      </Card>

      {/* Topic Development */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Topic Development（主張展開）</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">良い点</h4>
            <ul className="list-disc list-inside space-y-2">
              {essay.feedback.topicDevelopment.goodPoints.map((point, index) => (
                <li key={index} className="text-gray-700">{point}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">改善点</h4>
            <ul className="list-disc list-inside space-y-2">
              {essay.feedback.topicDevelopment.improvements.map((improvement, index) => (
                <li key={index} className="text-gray-700">{improvement}</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* General Description */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">General Description（設問への回答）</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">良い点</h4>
            <ul className="list-disc list-inside space-y-2">
              {essay.feedback.generalDescription.goodPoints.map((point, index) => (
                <li key={index} className="text-gray-700">{point}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">改善点</h4>
            <ul className="list-disc list-inside space-y-2">
              {essay.feedback.generalDescription.improvements.map((improvement, index) => (
                <li key={index} className="text-gray-700">{improvement}</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* Specific Suggestions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">新しいアイデアの提案</h3>
        <ul className="list-disc list-inside space-y-2">
          {essay.feedback.specificSuggestions.suggestions.map((suggestion, index) => (
            <li key={index} className="text-gray-700">{suggestion}</li>
          ))}
        </ul>
      </Card>
    </div>
  )
} 