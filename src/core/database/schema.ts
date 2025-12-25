import Realm, { ObjectSchema } from "realm";

/**
 * Embedded Chapter - lives inside Manga document
 * No primary key needed for embedded objects
 */
export class ChapterSchema extends Realm.Object<ChapterSchema> {
  id!: string;
  number!: number;
  title?: string;
  url!: string;
  date?: string;
  isRead!: boolean;
  lastPageRead!: number;
  totalPages?: number;

  static schema: ObjectSchema = {
    name: "Chapter",
    embedded: true,
    properties: {
      id: "string",
      number: "double",
      title: "string?",
      url: "string",
      date: "string?",
      isRead: { type: "bool", default: false },
      lastPageRead: { type: "int", default: 0 },
      totalPages: "int?",
    },
  };
}

/**
 * Embedded ReadingProgress - lives inside Manga document
 */
export class ReadingProgressSchema extends Realm.Object<ReadingProgressSchema> {
  lastChapterId?: string;
  lastChapterNumber?: number;
  lastPage!: number;
  timestamp!: number;

  static schema: ObjectSchema = {
    name: "ReadingProgress",
    embedded: true,
    properties: {
      lastChapterId: "string?",
      lastChapterNumber: "double?",
      lastPage: { type: "int", default: 0 },
      timestamp: "int",
    },
  };
}

/**
 * Main Manga document - contains all data needed for library access
 * No joins required - chapters and progress are embedded
 */
export class MangaSchema extends Realm.Object<MangaSchema> {
  id!: string; // Format: sourceId_mangaId
  sourceId!: string;
  title!: string;
  cover?: string;
  localCover?: string;
  url!: string;
  author?: string;
  artist?: string;
  status?: string;
  description?: string;
  genres!: Realm.List<string>;
  chapters!: Realm.List<ChapterSchema>;
  progress?: ReadingProgressSchema;
  readingStatus?: string; // reading, completed, on_hold, dropped, plan_to_read
  addedAt!: number;
  lastUpdated?: number;

  static primaryKey = "id";
  static schema: ObjectSchema = {
    name: "Manga",
    primaryKey: "id",
    properties: {
      id: "string",
      sourceId: "string",
      title: "string",
      cover: "string?",
      localCover: "string?",
      url: "string",
      author: "string?",
      artist: "string?",
      status: "string?",
      description: "string?",
      genres: "string[]",
      chapters: "Chapter[]",
      progress: "ReadingProgress?",
      readingStatus: "string?",
      addedAt: "int",
      lastUpdated: "int?",
    },
  };
}

// Export all schemas for RealmProvider
export const realmSchemas = [MangaSchema, ChapterSchema, ReadingProgressSchema];

// Types for use in the app
export type ReadingStatus =
  | "reading"
  | "completed"
  | "on_hold"
  | "dropped"
  | "plan_to_read";
