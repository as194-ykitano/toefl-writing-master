"use client"

import { useState, useEffect, useRef } from "react"

interface TimerProps {
  initialSeconds: number
  isRunning: boolean
  onFinish: () => void
}

export default function Timer({ initialSeconds, isRunning, onFinish }: TimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const hasFinished = useRef(false)

  useEffect(() => {
    setSeconds(initialSeconds)
    hasFinished.current = false
    console.log('Timer initialized:', { initialSeconds, isRunning });
  }, [initialSeconds])

  useEffect(() => {
    console.log('Timer running state changed:', { isRunning, seconds });
    if (!isRunning) return

    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning])

  // Handle timer completion in a separate useEffect
  useEffect(() => {
    if (seconds === 0 && isRunning && !hasFinished.current) {
      hasFinished.current = true
      console.log('Timer finished, calling onFinish');
      onFinish()
    }
  }, [seconds, isRunning, onFinish])

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const isWarning = seconds <= 300 // 5分以下で警告色

  return (
    <div className={`text-2xl font-bold ${isWarning ? "text-red-600" : "text-gray-900"}`}>{formatTime(seconds)}</div>
  )
}
