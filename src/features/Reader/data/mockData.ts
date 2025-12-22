export interface ReaderPage {
  id: string;
  url: string;
}

export interface ChapterReaderData {
  chapterId: string;
  chapterNumber: number;
  mangaTitle: string;
  pages: ReaderPage[];
}

// Sample manga pages from public domain manga scanlations
export const MOCK_CHAPTER_PAGES: ChapterReaderData = {
  chapterId: "436",
  chapterNumber: 436,
  mangaTitle: "19 Tian",
  pages: [
    { id: "1", url: "https://picsum.photos/seed/manga1/800/1200" },
    { id: "2", url: "https://picsum.photos/seed/manga2/800/1200" },
    { id: "3", url: "https://picsum.photos/seed/manga3/800/1200" },
    { id: "4", url: "https://picsum.photos/seed/manga4/800/1200" },
    { id: "5", url: "https://picsum.photos/seed/manga5/800/1200" },
    { id: "6", url: "https://picsum.photos/seed/manga6/800/1200" },
    { id: "7", url: "https://picsum.photos/seed/manga7/800/1200" },
    { id: "8", url: "https://picsum.photos/seed/manga8/800/1200" },
  ],
};
