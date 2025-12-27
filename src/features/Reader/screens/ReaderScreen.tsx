import { ReaderContainer } from "../components/ReaderContainer";

/**
 * ReaderScreen is now a thin wrapper that renders the ReaderContainer.
 * All logic has been moved to ReaderContainer and child components.
 */
export function ReaderScreen() {
  return <ReaderContainer />;
}
