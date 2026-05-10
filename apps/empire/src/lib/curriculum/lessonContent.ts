// ============================================================================
// Lesson-content dynamic loader
// ============================================================================
// The four lesson-content modules (courseContent, foundationsContent,
// ecflBandsContent, ecflContent) add up to ~19k lines of TypeScript and
// previously anchored the CurriculumShell chunk at ~2.8MB. They're only
// needed once a learner actually opens a lesson — not on the shell/tab view.
//
// This loader dynamic-imports them on first use and caches the resolved
// objects in module-level state. Subsequent lessons skip the network / IO
// cost entirely.
// ============================================================================

interface LessonBlock {
  type: string;
  [key: string]: unknown;
}

interface LessonSection {
  id: string;
  title: string;
  blocks: LessonBlock[];
}

interface CourseLesson {
  id: string;
  title?: string;
}

interface CourseLike {
  lessons?: CourseLesson[];
}

let _courseContent: Record<string, LessonBlock[]> | null = null;
let _foundationsContent: Record<string, LessonBlock[]> | null = null;
let _ecflBandsContent: Record<string, LessonBlock[]> | null = null;
let _COURSE_CONTENT: Record<string, { sections?: LessonSection[] }> | null = null;
let _loaded = false;
let _loading: Promise<void> | null = null;

async function ensureLoaded(): Promise<void> {
  if (_loaded) return;
  if (_loading) return _loading;
  _loading = (async () => {
    const [cc, fc, eb, ec] = await Promise.all([
      import('../../data/courseContent'),
      import('../../data/foundationsContent'),
      import('../../data/ecflBandsContent'),
      import('../../data/ecflContent'),
    ]);
    _courseContent = (cc as { courseContent: Record<string, LessonBlock[]> }).courseContent;
    _foundationsContent = (fc as { foundationsContent: Record<string, LessonBlock[]> }).foundationsContent;
    _ecflBandsContent = (eb as { ecflBandsContent: Record<string, LessonBlock[]> }).ecflBandsContent;
    _COURSE_CONTENT = (ec as { COURSE_CONTENT: Record<string, { sections?: LessonSection[] }> }).COURSE_CONTENT;
    _loaded = true;
  })();
  return _loading;
}

/**
 * Resolve lesson sections for a given course/lesson index. Dynamically loads
 * the content modules on first call; cached thereafter.
 *
 * Lookup order: F0 foundations → ECFL sections → legacy block arrays.
 */
export async function loadLessonSections(
  course: CourseLike,
  lessonIndex: number,
): Promise<LessonSection[]> {
  await ensureLoaded();
  const lesson = course?.lessons?.[lessonIndex];
  const lessonId = lesson?.id;
  const lessonTitle = lesson?.title ?? 'Lesson';
  if (!lessonId) return [];
  if (_foundationsContent && _foundationsContent[lessonId]) {
    return [{ id: 'main', title: lessonTitle, blocks: _foundationsContent[lessonId] }];
  }
  if (_ecflBandsContent && _ecflBandsContent[lessonId]) {
    return [{ id: 'main', title: lessonTitle, blocks: _ecflBandsContent[lessonId] }];
  }
  if (_COURSE_CONTENT && _COURSE_CONTENT[lessonId]?.sections) {
    return _COURSE_CONTENT[lessonId].sections ?? [];
  }
  if (_courseContent && _courseContent[lessonId]) {
    return [{ id: 'main', title: lessonTitle, blocks: _courseContent[lessonId] }];
  }
  return [];
}
