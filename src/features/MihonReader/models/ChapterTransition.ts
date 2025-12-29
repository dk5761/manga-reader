import type { ReaderChapter } from "./ReaderChapter";

/**
 * ChapterTransition - Visual separator between chapters.
 * Matches Mihon's ChapterTransition sealed class.
 *
 * - 'prev': Transition showing previous chapter info (scroll up to enter)
 * - 'next': Transition showing next chapter info (scroll down to enter)
 */
export interface ChapterTransition {
  type: "transition";
  /** Direction of the transition */
  direction: "prev" | "next";
  /** The current chapter we're transitioning FROM */
  from: ReaderChapter;
  /** The chapter we're transitioning TO (null if no more chapters) */
  to: ReaderChapter | null;
}

/**
 * Create a prev transition (appears at top of chapter)
 */
export function createPrevTransition(
  from: ReaderChapter,
  to: ReaderChapter | null
): ChapterTransition {
  return {
    type: "transition",
    direction: "prev",
    from,
    to,
  };
}

/**
 * Create a next transition (appears at bottom of chapter)
 */
export function createNextTransition(
  from: ReaderChapter,
  to: ReaderChapter | null
): ChapterTransition {
  return {
    type: "transition",
    direction: "next",
    from,
    to,
  };
}

/**
 * Check if transition has a destination chapter
 */
export function hasDestination(transition: ChapterTransition): boolean {
  return transition.to !== null;
}

/**
 * Get the destination chapter's loading status
 */
export function getTransitionStatus(
  transition: ChapterTransition
): "wait" | "loading" | "loaded" | "error" | "none" {
  if (!transition.to) return "none";
  return transition.to.state.status;
}
