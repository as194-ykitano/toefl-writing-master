"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"

interface TextAreaWithControlsProps {
  value: string
  onChange: (newText: string) => void
  disabled: boolean
  wordCount: number
  onReset: () => void
  onSubmit: () => void
}

export default function TextAreaWithControls({
  value,
  onChange,
  disabled,
  wordCount,
  onReset,
  onSubmit,
}: TextAreaWithControlsProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleCopy = async () => {
    const textarea = textareaRef.current
    if (!textarea) return

    const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd)
    if (selectedText) {
      await navigator.clipboard.writeText(selectedText)
    }
  }

  const handleCut = async () => {
    const textarea = textareaRef.current
    if (!textarea) return

    const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd)
    if (selectedText) {
      await navigator.clipboard.writeText(selectedText)
      const newText =
        textarea.value.substring(0, textarea.selectionStart) + textarea.value.substring(textarea.selectionEnd)
      onChange(newText)
    }
  }

  const handlePaste = async () => {
    const textarea = textareaRef.current
    if (!textarea) return

    try {
      const clipboardText = await navigator.clipboard.readText()
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newText = textarea.value.substring(0, start) + clipboardText + textarea.value.substring(end)
      onChange(newText)

      // カーソル位置を調整
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + clipboardText.length
        textarea.focus()
      }, 0)
    } catch (err) {
      console.error("Paste failed:", err)
    }
  }

  const handleReset = () => {
    if (window.confirm("本当に全ての文章を削除しますか？この操作は取り消せません。")) {
      onReset()
    }
  }

  return (
    <div className="space-y-4">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full h-[500px] p-4 border border-gray-300 rounded-lg text-sm leading-relaxed resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        placeholder="ここにエッセイを書いてください..."
      />

      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">Word Count: {wordCount}</div>

        <div className="flex gap-2">
          <Button onClick={handleCopy} disabled={disabled} variant="outline" size="sm">
            Copy
          </Button>
          <Button onClick={handleCut} disabled={disabled} variant="outline" size="sm">
            Cut
          </Button>
          <Button onClick={handlePaste} disabled={disabled} variant="outline" size="sm">
            Paste
          </Button>
          <Button
            onClick={handleReset}
            disabled={disabled}
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700"
          >
            Reset
          </Button>
          <Button 
            onClick={() => {
              console.log('=== Submit button clicked ===');
              onSubmit();
            }} 
            disabled={disabled} 
            className="bg-green-600 hover:bg-green-700" 
            size="sm"
          >
            Submit
          </Button>
        </div>
      </div>
    </div>
  )
}
