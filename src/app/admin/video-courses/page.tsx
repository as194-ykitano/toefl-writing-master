"use client";

// 管理者：動画コース一覧・作成（english-gym-admin から移植）。
// gating とレイアウトは admin/layout.tsx（AdminChrome）が担う。
import { VideoCourseList } from "@/components/video-courses/video-course-list";

export default function AdminVideoCoursesPage() {
  return <VideoCourseList mode="admin" editorBasePath="/admin/video-courses" />;
}
