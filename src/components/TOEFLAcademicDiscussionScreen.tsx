"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { User, GraduationCap, Clock, Eye, EyeOff } from "lucide-react";
import Image from "next/image";

interface DiscussionContent {
  professor: string;
  student1: string;
  student2: string;
  professorName?: string;
  student1Name?: string;
  student2Name?: string;
}

interface TOEFLAcademicDiscussionScreenProps {
  discussionContent: DiscussionContent;
  essayText: string;
  onEssayTextChange: (text: string) => void;
  wordCount: number;
  timeRemaining: number;
  onTimerToggle: () => void;
  timerHidden: boolean;
  onWordCountToggle: () => void;
  wordCountHidden: boolean;
  stance: 'agree' | 'disagree' | null;
  onStanceChange: (stance: 'agree' | 'disagree') => void;
  onSubmit: () => void;
}

export default function TOEFLAcademicDiscussionScreen({
  discussionContent,
  essayText,
  onEssayTextChange,
  wordCount,
  timeRemaining,
  onTimerToggle,
  timerHidden,
  onWordCountToggle,
  wordCountHidden,
  stance,
  onStanceChange,
  onSubmit,
}: TOEFLAcademicDiscussionScreenProps) {
  // 時間を分:秒形式に変換
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Textarea reference and simple history stacks for Undo/Redo
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [localText, setLocalText] = useState<string>(essayText);
  const [, setHistory] = useState<string[]>([]);
  const [, setRedoStack] = useState<string[]>([]);

  // Keep local in sync when parent text changes externally
  useEffect(() => {
    setLocalText(essayText);
  }, [essayText]);

  // Propagate to parent after render
  useEffect(() => {
    if (localText !== essayText) {
      onEssayTextChange(localText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localText]);

  // Wrap onChange to track history
  const handleTextChange = (newText: string) => {
    setHistory((prev) => [...prev, localText]);
    setRedoStack([]);
    setLocalText(newText);
  };

  const handleCut = async () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start === end) return; // Nothing selected
    const selected = localText.slice(start, end);
    try {
      await navigator.clipboard.writeText(selected);
    } catch {}
    const newText = localText.slice(0, start) + localText.slice(end);
    handleTextChange(newText);
    // Move caret to start position
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start;
        textareaRef.current.focus();
      }
    });
  };

  const handlePaste = async () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? localText.length;
    const end = el.selectionEnd ?? localText.length;
    try {
      const clip = await navigator.clipboard.readText();
      const newText = localText.slice(0, start) + clip + localText.slice(end);
      const caretPos = start + clip.length;
      handleTextChange(newText);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = caretPos;
          textareaRef.current.focus();
        }
      });
    } catch (err) {
      console.error('Failed to paste text:', err);
    }
  };

  const handleUndo = () => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const previous = prev[prev.length - 1];
      setRedoStack((r) => [...r, localText]);
      setLocalText(previous);
      return prev.slice(0, -1);
    });
  };

  const handleRedo = () => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const next = prev[prev.length - 1];
      setHistory((h) => [...h, localText]);
      setLocalText(next);
      return prev.slice(0, -1);
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ETS TOEFL Header */}
      <div className="bg-green-600 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-lg font-bold">TOEFL Academic Discussion</div>
        </div>
        <div className="flex items-center gap-4">
          {!timerHidden && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="font-mono">{formatTime(timeRemaining)}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onTimerToggle}
            className="text-white hover:bg-green-700"
          >
            {timerHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {timerHidden ? "Show Timer" : "Hide Timer"}
          </Button>
          <Button
            size="sm"
            onClick={onSubmit}
            className="bg-white text-green-700 font-bold px-5 py-1.5 rounded-full shadow transition-all duration-200 ring-2 ring-white/60 hover:bg-green-100 hover:text-green-800 hover:shadow-lg hover:-translate-y-0.5 hover:scale-105 active:translate-y-0 active:scale-100"
          >
            Submit
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-3 gap-6 h-[calc(100vh-120px)]">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Instructions + Professor Comment merged in one frame */}
            <div className="bg-white border border-gray-300 rounded p-4">
              {/* Instructions Section */}
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Your professor is teaching a class on career readiness. Write a post responding to the professor&apos;s question.
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p className="font-semibold">In your response, you should do the following.</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Express and support your opinion.</li>
                  <li>Make a contribution to the discussion in your own words.</li>
                </ul>
                <p className="mt-3">An effective response will contain at least 100 words.</p>
              </div>

              {/* Professor Profile */}
              <div className="flex flex-col items-center mt-4">
                <div className="w-24 h-24 bg-purple-200 rounded-full flex items-center justify-center flex-shrink-0 mb-2 ring-4 ring-purple-300 overflow-hidden">
                  <Image
                    src="/image/professor-default.png"
                    alt="Professor"
                    width={96}
                    height={96}
                    className="rounded-full"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <GraduationCap className="w-12 h-12 text-purple-700" />
                </div>
                <div className="text-sm font-semibold text-gray-900 text-center">
                  {discussionContent.professorName || "Doctor Gupta"}
                </div>
              </div>

              {/* Divider and Professor Comment */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {discussionContent.professor}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-2 space-y-6">
            {/* Student Responses Section */}
            <div className="bg-white border border-gray-300 rounded p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Student Responses</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-700">Your stance:</span>
                  <label className="flex items-center gap-1 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="stance"
                      value="agree"
                      checked={stance === 'agree'}
                      onChange={() => onStanceChange('agree')}
                      className="cursor-pointer"
                    />
                    Agree
                  </label>
                  <label className="flex items-center gap-1 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="stance"
                      value="disagree"
                      checked={stance === 'disagree'}
                      onChange={() => onStanceChange('disagree')}
                      className="cursor-pointer"
                    />
                    Disagree
                  </label>
                </div>
                {stance === null && (
                  <div className="text-red-600 text-sm mt-2">
                    Please select Agree or Disagree to continue.
                  </div>
                )}
                 {/* Kelly's Response */}
                 <div className="flex items-start gap-3">
                   <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-blue-300 overflow-hidden">
                     <Image
                       src="/image/student-kelly.png"
                       alt="Kelly"
                       width={48}
                       height={48}
                       className="rounded-full"
                       onError={(e) => {
                         e.currentTarget.style.display = 'none';
                       }}
                     />
                     <User className="w-6 h-6 text-blue-700" />
                   </div>
                   <div className="flex-1">
                     <div className="font-semibold text-gray-900 mb-1">
                       {discussionContent.student1Name || "Kelly"}
                     </div>
                     <p className="text-sm text-gray-700 leading-relaxed">
                       {discussionContent.student1}
                     </p>
                   </div>
                 </div>

                 {/* Andrew's Response */}
                 <div className="flex items-start gap-3">
                   <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-green-300 overflow-hidden">
                     <Image
                       src="/image/student-andrew.png"
                       alt="Andrew"
                       width={48}
                       height={48}
                       className="rounded-full"
                       onError={(e) => {
                         e.currentTarget.style.display = 'none';
                       }}
                     />
                     <User className="w-6 h-6 text-green-700" />
                   </div>
                   <div className="flex-1">
                     <div className="font-semibold text-gray-900 mb-1">
                       {discussionContent.student2Name || "Andrew"}
                     </div>
                     <p className="text-sm text-gray-700 leading-relaxed">
                       {discussionContent.student2}
                     </p>
                   </div>
                 </div>
              </div>
            </div>

            {/* Writing Area */}
            <div className="bg-white border border-gray-300 rounded p-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCut}
                    className="text-xs"
                  >
                    Cut
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePaste}
                    className="text-xs"
                  >
                    Paste
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUndo}
                    className="text-xs"
                  >
                    Undo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRedo}
                    className="text-xs"
                  >
                    Redo
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onWordCountToggle}
                    className="text-xs"
                  >
                    {wordCountHidden ? "Show Word Count" : "Hide Word Count"}
                  </Button>
                  {!wordCountHidden && (
                    <span className="text-sm text-gray-600">{wordCount}</span>
                  )}
                </div>
              </div>
              
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={localText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder="Write a post."
                  className="w-full h-full p-3 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ minHeight: '300px' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
