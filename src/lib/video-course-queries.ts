import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type UpdateData,
  type PartialWithFieldValue,
  Timestamp,
} from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage } from "./firebase"
import type {
  FirebaseTimestamp,
  PracticeItemEmbeddedVideo,
  VideoCourse,
  VideoCourseLesson,
  VideoCourseModule,
  VideoCourseOwnerRole,
  VideoCourseProgress,
  VideoCourseVisibility,
} from "./types"
import {
  VIDEO_COURSES_COLLECTION,
  VIDEO_COURSE_LESSONS_COLLECTION,
  VIDEO_COURSE_MODULES_COLLECTION,
  VIDEO_COURSE_PROGRESS_COLLECTION,
} from "./types"

function tsToFirebaseTimestamp(value: unknown): FirebaseTimestamp {
  if (value instanceof Timestamp) return value as unknown as FirebaseTimestamp
  if (value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return value as FirebaseTimestamp
  }
  if (value && typeof (value as { seconds?: number }).seconds === "number") {
    const t = value as { seconds: number; nanoseconds?: number }
    return new Timestamp(t.seconds, t.nanoseconds ?? 0) as unknown as FirebaseTimestamp
  }
  return Timestamp.now() as unknown as FirebaseTimestamp
}

function parseEmbeddedVideo(data: unknown): PracticeItemEmbeddedVideo | undefined {
  if (!data || typeof data !== "object") return undefined
  const o = data as Record<string, unknown>
  const p = o.provider
  const u = o.url
  if (p !== "youtube" && p !== "loom" && p !== "riverside" && p !== "spotify") return undefined
  if (typeof u !== "string" || !u.trim()) return undefined
  return { provider: p, url: u.trim() }
}

export function videoCourseProgressDocId(studentUid: string, courseId: string): string {
  return `${studentUid}__${courseId}`
}

function docToCourse(id: string, data: DocumentData): VideoCourse {
  return {
    id,
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    thumbnailUrl: String(data.thumbnailUrl ?? ""),
    ownerId: String(data.ownerId ?? ""),
    ownerRole: data.ownerRole === "admin" ? "admin" : "coach",
    visibility: data.visibility === "all_students" ? "all_students" : "coach_clients",
    published: Boolean(data.published),
    order: typeof data.order === "number" ? data.order : 0,
    targetExams: Array.isArray(data.targetExams)
      ? data.targetExams.filter((value: unknown): value is "toefl" | "ielts" | "toeic" | "advanced" =>
          value === "toefl" || value === "ielts" || value === "toeic" || value === "advanced")
      : undefined,
    createdAt: tsToFirebaseTimestamp(data.createdAt),
    updatedAt: tsToFirebaseTimestamp(data.updatedAt ?? data.createdAt),
  }
}

function docToModule(id: string, data: DocumentData): VideoCourseModule {
  return {
    id,
    courseId: String(data.courseId ?? ""),
    title: String(data.title ?? ""),
    order: typeof data.order === "number" ? data.order : 0,
  }
}

function docToLesson(id: string, data: DocumentData): VideoCourseLesson {
  const ct = data.contentType === "text" ? "text" : "video"
  return {
    id,
    courseId: String(data.courseId ?? ""),
    moduleId: String(data.moduleId ?? ""),
    title: String(data.title ?? ""),
    order: typeof data.order === "number" ? data.order : 0,
    contentType: ct,
    body: String(data.body ?? ""),
    embeddedVideo: parseEmbeddedVideo(data.embeddedVideo),
  }
}

function docToProgress(id: string, data: DocumentData): VideoCourseProgress {
  return {
    id,
    studentUid: String(data.studentUid ?? ""),
    courseId: String(data.courseId ?? ""),
    completedLessonIds: Array.isArray(data.completedLessonIds) ? data.completedLessonIds.map(String) : [],
    updatedAt: tsToFirebaseTimestamp(data.updatedAt ?? data.createdAt),
  }
}

// ─── Courses ───

export async function createVideoCourse(params: {
  title: string
  description: string
  thumbnailUrl: string
  ownerId: string
  ownerRole: VideoCourseOwnerRole
  visibility: VideoCourseVisibility
  published: boolean
  order: number
  targetExams?: Array<"toefl" | "ielts" | "toeic" | "advanced">
}): Promise<string> {
  const col = collection(db, VIDEO_COURSES_COLLECTION)
  const refDoc = await addDoc(col, {
    title: params.title.trim(),
    description: params.description.trim(),
    thumbnailUrl: params.thumbnailUrl.trim(),
    ownerId: params.ownerId,
    ownerRole: params.ownerRole,
    visibility: params.visibility,
    published: params.published,
    order: params.order,
    targetExams: params.targetExams ?? [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return refDoc.id
}

export async function updateVideoCourse(
  courseId: string,
  patch: Partial<{
    title: string
    description: string
    thumbnailUrl: string
    visibility: VideoCourseVisibility
    published: boolean
    order: number
    targetExams?: Array<"toefl" | "ielts" | "toeic" | "advanced">
  }>
): Promise<void> {
  const d = doc(db, VIDEO_COURSES_COLLECTION, courseId)
  const payload: Record<string, unknown> = { ...patch, updatedAt: serverTimestamp() }
  await updateDoc(d, payload as UpdateData<DocumentData>)
}

export async function getVideoCourse(courseId: string): Promise<VideoCourse | null> {
  const snap = await getDoc(doc(db, VIDEO_COURSES_COLLECTION, courseId))
  if (!snap.exists()) return null
  return docToCourse(snap.id, snap.data())
}

export async function listVideoCoursesForAdmin(): Promise<VideoCourse[]> {
  const qy = query(collection(db, VIDEO_COURSES_COLLECTION), orderBy("order", "asc"))
  const snap = await getDocs(qy)
  return snap.docs.map((d) => docToCourse(d.id, d.data()))
}

export async function listVideoCoursesForCoach(): Promise<VideoCourse[]> {
  const qy = query(collection(db, VIDEO_COURSES_COLLECTION), orderBy("order", "asc"))
  const snap = await getDocs(qy)
  return snap.docs.map((d) => docToCourse(d.id, d.data()))
}

/** Published courses visible to a student: platform-wide + coach-owned for their coach. */
export function studentCanViewPublishedCourse(
  course: VideoCourse,
  studentCoachUid: string | undefined
): boolean {
  if (!course.published) return false
  if (course.visibility === "all_students") return true
  if (course.visibility === "coach_clients" && studentCoachUid && course.ownerId === studentCoachUid) {
    return true
  }
  return false
}

/** Admin or owning coach can open learner-style preview (including drafts). */
export function staffCanPreviewVideoCourse(
  course: VideoCourse,
  userUid: string | undefined,
  isAdmin: boolean
): boolean {
  if (!userUid) return false
  if (isAdmin) return true
  // Coaches can view all courses; ownership is only required for editing.
  return true
}

/**
 * 生徒に見せる公開コースを取得する。
 * Firestore ルールは非管理者に published == true のドキュメントのみ読み取りを許可するため、
 * クエリは必ず published == true で絞る（単一等価フィルタ＝複合インデックス不要）。
 * visibility / owner の判定はメモリ上で行う。
 */
export async function listVisibleVideoCoursesForStudent(coachUid: string | undefined): Promise<VideoCourse[]> {
  const col = collection(db, VIDEO_COURSES_COLLECTION)
  const out = new Map<string, VideoCourse>()

  const qPublished = query(col, where("published", "==", true))
  const snap = await getDocs(qPublished)
  for (const d of snap.docs) {
    const c = docToCourse(d.id, d.data())
    if (studentCanViewPublishedCourse(c, coachUid)) {
      out.set(d.id, c)
    }
  }

  return [...out.values()].sort((a, b) => a.order - b.order)
}

/** Catalog card label for courses created by an admin (not the individual admin’s name). */
export const VIDEO_COURSE_PLATFORM_CREATOR_LABEL = "ENGLISH GYM"

/**
 * Human-readable label for a course `ownerId`.
 * PrepMaster にはコーチ/ユーザーのプロフィール参照基盤が無く、移植した全コースは
 * admin 所有（ENGLISH GYM 制作）なので、コーチ所有コースは UID スタブで表示する。
 */
export async function getVideoCourseOwnerDisplayLabel(ownerId: string): Promise<string> {
  const id = ownerId.trim()
  if (!id) return "Unknown"
  return `${id.slice(0, 6)}…`
}

export async function deleteVideoCourse(courseId: string): Promise<void> {
  const lessonsQy = query(collection(db, VIDEO_COURSE_LESSONS_COLLECTION), where("courseId", "==", courseId))
  const modulesQy = query(collection(db, VIDEO_COURSE_MODULES_COLLECTION), where("courseId", "==", courseId))
  const [lessonsSnap, modulesSnap] = await Promise.all([getDocs(lessonsQy), getDocs(modulesQy)])

  const batch = writeBatch(db)
  for (const d of lessonsSnap.docs) {
    batch.delete(d.ref)
  }
  for (const d of modulesSnap.docs) {
    batch.delete(d.ref)
  }
  batch.delete(doc(db, VIDEO_COURSES_COLLECTION, courseId))
  await batch.commit()
}

// ─── Modules ───

export async function createVideoCourseModule(params: {
  courseId: string
  title: string
  order: number
}): Promise<string> {
  const col = collection(db, VIDEO_COURSE_MODULES_COLLECTION)
  const refDoc = await addDoc(col, {
    courseId: params.courseId,
    title: params.title.trim(),
    order: params.order,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return refDoc.id
}

export async function updateVideoCourseModule(
  moduleId: string,
  patch: Partial<{ title: string; order: number }>
): Promise<void> {
  await updateDoc(doc(db, VIDEO_COURSE_MODULES_COLLECTION, moduleId), {
    ...patch,
    updatedAt: serverTimestamp(),
  })
}

export async function listVideoCourseModules(courseId: string): Promise<VideoCourseModule[]> {
  const qy = query(collection(db, VIDEO_COURSE_MODULES_COLLECTION), where("courseId", "==", courseId))
  const snap = await getDocs(qy)
  return snap.docs.map((d) => docToModule(d.id, d.data())).sort((a, b) => a.order - b.order)
}

export async function deleteVideoCourseModule(moduleId: string, courseId: string): Promise<void> {
  const lessonsQy = query(collection(db, VIDEO_COURSE_LESSONS_COLLECTION), where("courseId", "==", courseId))
  const lessonsSnap = await getDocs(lessonsQy)
  const batch = writeBatch(db)
  for (const d of lessonsSnap.docs) {
    if (String(d.data().moduleId ?? "") === moduleId) {
      batch.delete(d.ref)
    }
  }
  batch.delete(doc(db, VIDEO_COURSE_MODULES_COLLECTION, moduleId))
  await batch.commit()
}

// ─── Lessons ───

export async function createVideoCourseLesson(params: {
  courseId: string
  moduleId: string
  title: string
  order: number
  contentType: VideoCourseLesson["contentType"]
  body: string
  embeddedVideo?: PracticeItemEmbeddedVideo
}): Promise<string> {
  const col = collection(db, VIDEO_COURSE_LESSONS_COLLECTION)
  const payload: Record<string, unknown> = {
    courseId: params.courseId,
    moduleId: params.moduleId,
    title: params.title.trim(),
    order: params.order,
    contentType: params.contentType,
    body: params.body,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  if (params.embeddedVideo?.url?.trim()) {
    payload.embeddedVideo = {
      provider: params.embeddedVideo.provider,
      url: params.embeddedVideo.url.trim(),
    }
  }
  const refDoc = await addDoc(col, payload)
  return refDoc.id
}

export async function updateVideoCourseLesson(
  lessonId: string,
  patch: Partial<{
    title: string
    order: number
    targetExams: Array<"toefl" | "ielts" | "toeic" | "advanced">
    contentType: VideoCourseLesson["contentType"]
    body: string
    embeddedVideo: PracticeItemEmbeddedVideo | null
    moduleId: string
  }>
): Promise<void> {
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() }
  if (patch.title !== undefined) payload.title = patch.title.trim()
  if (patch.order !== undefined) payload.order = patch.order
  if (patch.contentType !== undefined) payload.contentType = patch.contentType
  if (patch.body !== undefined) payload.body = patch.body
  if (patch.moduleId !== undefined) payload.moduleId = patch.moduleId
  if (patch.embeddedVideo === null) {
    payload.embeddedVideo = deleteField()
  } else if (patch.embeddedVideo?.url?.trim()) {
    payload.embeddedVideo = {
      provider: patch.embeddedVideo.provider,
      url: patch.embeddedVideo.url.trim(),
    }
  }
  await updateDoc(doc(db, VIDEO_COURSE_LESSONS_COLLECTION, lessonId), payload as UpdateData<DocumentData>)
}

export async function listVideoCourseLessons(courseId: string): Promise<VideoCourseLesson[]> {
  const qy = query(collection(db, VIDEO_COURSE_LESSONS_COLLECTION), where("courseId", "==", courseId))
  const snap = await getDocs(qy)
  return snap.docs.map((d) => docToLesson(d.id, d.data())).sort((a, b) => a.order - b.order)
}

export async function getVideoCourseLesson(lessonId: string): Promise<VideoCourseLesson | null> {
  const snap = await getDoc(doc(db, VIDEO_COURSE_LESSONS_COLLECTION, lessonId))
  if (!snap.exists()) return null
  return docToLesson(snap.id, snap.data())
}

export async function deleteVideoCourseLesson(lessonId: string): Promise<void> {
  await deleteDoc(doc(db, VIDEO_COURSE_LESSONS_COLLECTION, lessonId))
}

export type VideoCourseWithStructure = {
  course: VideoCourse
  modules: VideoCourseModule[]
  lessons: VideoCourseLesson[]
}

export async function fetchVideoCourseWithStructure(courseId: string): Promise<VideoCourseWithStructure | null> {
  const course = await getVideoCourse(courseId)
  if (!course) return null
  const [modules, lessons] = await Promise.all([listVideoCourseModules(courseId), listVideoCourseLessons(courseId)])
  return { course, modules, lessons }
}

const FIRESTORE_IN_QUERY_LIMIT = 10

/** Lesson ids grouped by course — batched `in` queries (max 10 ids per query). */
export async function getLessonIdsByCourseIds(
  courseIds: string[]
): Promise<Record<string, Set<string>>> {
  const result: Record<string, Set<string>> = {}
  for (const id of courseIds) result[id] = new Set()
  if (courseIds.length === 0) return result

  const batches: string[][] = []
  for (let i = 0; i < courseIds.length; i += FIRESTORE_IN_QUERY_LIMIT) {
    batches.push(courseIds.slice(i, i + FIRESTORE_IN_QUERY_LIMIT))
  }

  await Promise.all(
    batches.map(async (batch) => {
      const qy = query(collection(db, VIDEO_COURSE_LESSONS_COLLECTION), where("courseId", "in", batch))
      const snap = await getDocs(qy)
      for (const d of snap.docs) {
        const courseId = String(d.data().courseId ?? "")
        if (!courseId) continue
        result[courseId]?.add(d.id)
      }
    })
  )

  return result
}

export async function getVideoCourseProgressBatch(
  studentUid: string,
  courseIds: string[]
): Promise<Map<string, VideoCourseProgress | null>> {
  const map = new Map<string, VideoCourseProgress | null>()
  if (courseIds.length === 0) return map

  await Promise.all(
    courseIds.map(async (courseId) => {
      const progress = await getVideoCourseProgress(studentUid, courseId)
      map.set(courseId, progress)
    })
  )

  return map
}

export type StudentVideoCourseCatalogRow = {
  course: VideoCourse
  totalLessons: number
  completedCount: number
  creatorLabel: string
}

/** Optimized catalog payload for the student contents page (parallel batched reads). */
export async function fetchStudentVideoCourseCatalog(
  studentUid: string,
  coachUid: string | undefined
): Promise<StudentVideoCourseCatalogRow[]> {
  const courses = await listVisibleVideoCoursesForStudent(coachUid)
  if (courses.length === 0) return []

  const courseIds = courses.map((c) => c.id)
  const coachOwnerIds = [
    ...new Set(courses.filter((c) => c.ownerRole === "coach").map((c) => c.ownerId).filter(Boolean)),
  ]

  const [lessonIdsByCourse, progressMap, ...coachLabels] = await Promise.all([
    getLessonIdsByCourseIds(courseIds),
    getVideoCourseProgressBatch(studentUid, courseIds),
    ...coachOwnerIds.map((id) => getVideoCourseOwnerDisplayLabel(id)),
  ])

  const coachNameById = new Map<string, string>()
  coachOwnerIds.forEach((id, index) => {
    coachNameById.set(id, coachLabels[index] ?? "Coach")
  })

  return courses.map((course) => {
    const lessonIds = lessonIdsByCourse[course.id] ?? new Set<string>()
    const totalLessons = lessonIds.size
    const progress = progressMap.get(course.id)
    const completedCount =
      progress?.completedLessonIds.filter((id) => lessonIds.has(id)).length ?? 0
    const creatorLabel =
      course.ownerRole === "admin"
        ? VIDEO_COURSE_PLATFORM_CREATOR_LABEL
        : (coachNameById.get(course.ownerId) ?? "Coach")

    return { course, totalLessons, completedCount, creatorLabel }
  })
}

/** Flat ordered list of lesson ids for navigation (module order, then lesson order). */
export function flattenLessonOrder(modules: VideoCourseModule[], lessons: VideoCourseLesson[]): VideoCourseLesson[] {
  const modOrder = [...modules].sort((a, b) => a.order - b.order)
  const byModule = new Map<string, VideoCourseLesson[]>()
  for (const m of modOrder) {
    byModule.set(
      m.id,
      lessons.filter((l) => l.moduleId === m.id).sort((a, b) => a.order - b.order)
    )
  }
  const flat: VideoCourseLesson[] = []
  for (const m of modOrder) {
    flat.push(...(byModule.get(m.id) ?? []))
  }
  return flat
}

// ─── Progress ───

export async function getVideoCourseProgress(
  studentUid: string,
  courseId: string
): Promise<VideoCourseProgress | null> {
  const pid = videoCourseProgressDocId(studentUid, courseId)
  const snap = await getDoc(doc(db, VIDEO_COURSE_PROGRESS_COLLECTION, pid))
  if (!snap.exists()) return null
  return docToProgress(snap.id, snap.data())
}

export async function markVideoCourseLessonsComplete(
  studentUid: string,
  courseId: string,
  lessonIds: string[]
): Promise<void> {
  if (lessonIds.length === 0) return
  const pid = videoCourseProgressDocId(studentUid, courseId)
  const refDoc = doc(db, VIDEO_COURSE_PROGRESS_COLLECTION, pid)
  const snap = await getDoc(refDoc)
  const base: Record<string, unknown> = {
    studentUid,
    courseId,
    updatedAt: serverTimestamp(),
    completedLessonIds: arrayUnion(...lessonIds),
  }
  if (!snap.exists()) {
    base.createdAt = serverTimestamp()
  }
  await setDoc(refDoc, base as PartialWithFieldValue<DocumentData>, { merge: true })
}

export async function uploadVideoCourseThumbnail(courseId: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image.")
  }
  const extFromName = file.name.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase()
  const extFromType = file.type.split("/")[1]?.split("+")[0]?.toLowerCase()
  const ext = extFromName || extFromType || "jpg"
  const filename = `video_course_thumbnails/${courseId}/${Date.now()}.${ext}`
  const storageRef = ref(storage, filename)
  await uploadBytes(storageRef, file, {
    contentType: file.type || undefined,
  })
  return getDownloadURL(storageRef)
}
