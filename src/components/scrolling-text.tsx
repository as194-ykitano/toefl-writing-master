interface ScrollingTextProps {
  text: string
  height?: number
}

export default function ScrollingText({ text, height = 600 }: ScrollingTextProps) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-y-auto" style={{ height: `${height}px` }}>
      <div className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">{text}</div>
    </div>
  )
}
