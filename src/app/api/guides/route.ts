import { NextRequest, NextResponse } from "next/server";
import { getGuide, listGuides } from "@/lib/guide-store";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    const guide = await getGuide(id);
    if (!guide || !guide.isPublished) return NextResponse.json({ error: "ガイドが見つかりません。" }, { status: 404 });
    return NextResponse.json({ guide });
  }
  const guides = (await listGuides()).filter((guide) => guide.isPublished);
  return NextResponse.json({ guides });
}
