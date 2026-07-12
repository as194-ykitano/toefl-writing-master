"use client"

import { useCallback, useState } from "react"
import Image from "next/image"
import { UploadCloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { uploadVideoCourseThumbnail } from "@/lib/video-course-queries"

type CourseThumbnailFieldProps = {
  courseId: string
  thumbnailUrl: string
  onUploaded: (url: string) => void
  disabled?: boolean
}

export function CourseThumbnailField({
  courseId,
  thumbnailUrl,
  onUploaded,
  disabled,
}: CourseThumbnailFieldProps) {
  const [isDragActive, setIsDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(
    async (file: File | null | undefined) => {
      if (!file || disabled || uploading) return
      setError(null)
      if (!file.type.startsWith("image/")) {
        setError("Please choose an image file.")
        return
      }
      setUploading(true)
      try {
        const url = await uploadVideoCourseThumbnail(courseId, file)
        onUploaded(url)
      } catch (e) {
        console.error(e)
        setError("Upload failed. Try again.")
      } finally {
        setUploading(false)
      }
    },
    [courseId, disabled, onUploaded, uploading]
  )

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      setIsDragActive(false)
      const file = event.dataTransfer.files?.[0]
      void handleFile(file)
    },
    [handleFile]
  )

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "relative flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-4 transition-colors",
          isDragActive && "border-primary bg-primary/5",
          (disabled || uploading) && "pointer-events-none opacity-70"
        )}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled && !uploading) setIsDragActive(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setIsDragActive(false)
        }}
        onDrop={handleDrop}
      >
        {thumbnailUrl ? (
          <div className="relative h-36 w-full max-w-md overflow-hidden rounded-lg border border-border bg-background">
            <Image src={thumbnailUrl} alt="" fill className="object-cover" unoptimized />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
            <UploadCloud className="h-10 w-10 opacity-60" />
            <p>Drag and drop an image, or choose a file.</p>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button type="button" variant="secondary" size="sm" disabled={disabled || uploading} asChild>
            <label className="cursor-pointer">
              {uploading ? "Uploading…" : "Choose image"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={disabled || uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ""
                  void handleFile(f)
                }}
              />
            </label>
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
