import { InfiniteReaderContainer } from "../components/InfiniteReaderContainer";

/**
 * ReaderScreen is now a thin wrapper that renders the InfiniteReaderContainer.
 * Uses seamless chapter scrolling.
 */
export function ReaderScreen() {
  return <InfiniteReaderContainer />;
}
