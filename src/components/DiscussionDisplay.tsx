"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, User, GraduationCap, Users } from "lucide-react";

interface DiscussionContent {
  professor: string;
  student1: string;
  student2: string;
  question: string;
}

interface DiscussionDisplayProps {
  discussionContent: DiscussionContent;
  className?: string;
}

export default function DiscussionDisplay({ 
  discussionContent, 
  className = "" 
}: DiscussionDisplayProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* 質問部分 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-blue-900">
            <MessageSquare className="w-5 h-5" />
            ディスカッションの質問
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-800 leading-relaxed">
            {discussionContent.question}
          </p>
        </CardContent>
      </Card>

      {/* 教授のコメント */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-purple-900">
            <GraduationCap className="w-4 h-4" />
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              教授
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-800 leading-relaxed text-sm">
            {discussionContent.professor}
          </p>
        </CardContent>
      </Card>

      {/* 学生のコメント */}
      <div className="space-y-3">
        {/* 学生1 */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-green-900">
              <User className="w-4 h-4" />
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                学生1
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-800 leading-relaxed text-sm">
              {discussionContent.student1}
            </p>
          </CardContent>
        </Card>

        {/* 学生2 */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-orange-900">
              <User className="w-4 h-4" />
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                学生2
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-800 leading-relaxed text-sm">
              {discussionContent.student2}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 指示文 */}
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-700 font-medium mb-1">
                あなたのタスク
              </p>
              <p className="text-sm text-gray-600">
                上記のディスカッションを読んで、あなたの意見を100語以上で述べてください。
                教授や他の学生の意見を参考にしながら、建設的な議論に参加してください。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

