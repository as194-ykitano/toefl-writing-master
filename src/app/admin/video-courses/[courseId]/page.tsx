"use client";

// 管理者：コースルート = 最初のレッスンへリダイレクト、無ければ雛形を生成（移植）。
import { StaffVideoCourseRootRedirect } from "@/components/video-courses/staff-video-course-root-redirect";

export default function AdminVideoCourseRootPage() {
  return <StaffVideoCourseRootRedirect mode="admin" />;
}
