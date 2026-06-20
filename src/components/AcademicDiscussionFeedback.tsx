import { TOEFLAcademicDiscussionFeedback } from "@/lib/types"
import { Card } from "@/components/ui/card"

interface AcademicDiscussionFeedbackProps {
  feedback: TOEFLAcademicDiscussionFeedback
}

export default function AcademicDiscussionFeedback({ feedback }: AcademicDiscussionFeedbackProps) {
  return (
    <div className="space-y-6">
      {/* 全体評価 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">全体評価</h3>
        <p className="text-gray-700">{feedback.overall}</p>
      </Card>

      {/* スコア */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">詳細スコア</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Topic Development</p>
            <p className="text-2xl font-bold">{feedback.detailedScores.topicDevelopment}/5</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Organization</p>
            <p className="text-2xl font-bold">{feedback.detailedScores.organization}/5</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Language Use</p>
            <p className="text-2xl font-bold">{feedback.detailedScores.languageUse}/5</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Development</p>
            <p className="text-2xl font-bold">{feedback.detailedScores.development}/5</p>
          </div>
        </div>
      </Card>

      {/* 長所 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">長所</h3>
        <ul className="list-disc list-inside space-y-2">
          {feedback.strengths.map((strength: string, index: number) => (
            <li key={index} className="text-gray-700">{strength}</li>
          ))}
        </ul>
      </Card>

      {/* 改善点 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">改善点</h3>
        <ul className="list-disc list-inside space-y-2">
          {feedback.improvements.map((improvement: string, index: number) => (
            <li key={index} className="text-gray-700">{improvement}</li>
          ))}
        </ul>
      </Card>

      {/* Topic Development */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Topic Development（トピック展開）</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">良い点</h4>
            <ul className="list-disc list-inside space-y-2">
              {feedback.topicDevelopment.goodPoints.map((point: string, index: number) => (
                <li key={index} className="text-gray-700">{point}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">改善点</h4>
            <ul className="list-disc list-inside space-y-2">
              {feedback.topicDevelopment.improvements.map((improvement: string, index: number) => (
                <li key={index} className="text-gray-700">{improvement}</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* Language Use */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Language Use（言語使用）</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">良い点</h4>
            <ul className="list-disc list-inside space-y-2">
              {feedback.languageUse.goodPoints.map((point: string, index: number) => (
                <li key={index} className="text-gray-700">{point}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">改善点</h4>
            <ul className="list-disc list-inside space-y-2">
              {feedback.languageUse.improvements.map((improvement: string, index: number) => (
                <li key={index} className="text-gray-700">{improvement}</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* Organization */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Organization（構成）</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">良い点</h4>
            <ul className="list-disc list-inside space-y-2">
              {feedback.organization.goodPoints.map((point: string, index: number) => (
                <li key={index} className="text-gray-700">{point}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">改善点</h4>
            <ul className="list-disc list-inside space-y-2">
              {feedback.organization.improvements.map((improvement: string, index: number) => (
                <li key={index} className="text-gray-700">{improvement}</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* Development */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Development（展開）</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">良い点</h4>
            <ul className="list-disc list-inside space-y-2">
              {feedback.development.goodPoints.map((point: string, index: number) => (
                <li key={index} className="text-gray-700">{point}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">改善点</h4>
            <ul className="list-disc list-inside space-y-2">
              {feedback.development.improvements.map((improvement: string, index: number) => (
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
          {feedback.specificSuggestions.suggestions.map((suggestion: any, index: number) => (
            <li key={index} className="text-gray-700">
              {typeof suggestion === 'string'
                ? suggestion
                : suggestion && typeof suggestion === 'object'
                ? [
                    suggestion.suggestion || suggestion.title,
                    suggestion.implementation,
                    suggestion.whereToInclude,
                    suggestion.effectiveness || suggestion.reasoning,
                    suggestion.example,
                  ]
                    .filter(Boolean)
                    .join(' / ')
                : ''}
            </li>
          ))}
        </ul>
      </Card>

      {/* Grammar Corrections */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Grammar Corrections</h3>
        {feedback.grammarCorrections?.corrections.map((correction, index) => (
          <div key={index} className="mb-4 p-4 bg-white rounded-lg shadow">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="mb-2">
                  <span className="text-red-500 line-through">{correction.original}</span>
                  <span className="mx-2">→</span>
                  <span className="text-green-500">{correction.corrected}</span>
                </div>
                <p className="text-gray-600 text-sm mb-2">{correction.explanation}</p>
                <p className="text-gray-500 text-sm italic">Context: {correction.context}</p>
              </div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}
