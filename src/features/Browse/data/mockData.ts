export interface Extension {
  id: string;
  name: string;
  icon: string;
  version: string;
  language: string;
  installed: boolean;
  hasUpdate: boolean;
  pinned: boolean;
}

export const MOCK_EXTENSIONS: Extension[] = [
  {
    id: "1",
    name: "Kissmanga",
    icon: "https://raw.githubusercontent.com/keiyoushi/extensions/main/icons/mangadex.png",
    version: "1.4.2",
    language: "EN",
    installed: true,
    hasUpdate: false,
    pinned: true,
  },
  {
    id: "2",
    name: "Asurascans",
    icon: "https://raw.githubusercontent.com/keiyoushi/extensions/main/icons/asurascans.png",
    version: "2.0.1",
    language: "EN",
    installed: true,
    hasUpdate: false,
    pinned: true,
  },
  {
    id: "3",
    name: "Mangakakalot",
    icon: "https://raw.githubusercontent.com/keiyoushi/extensions/main/icons/mangakakalot.png",
    version: "1.1.5",
    language: "EN",
    installed: false,
    hasUpdate: true,
    pinned: false,
  },
  {
    id: "4",
    name: "MangaDex",
    icon: "https://raw.githubusercontent.com/keiyoushi/extensions/main/icons/mangadex.png",
    version: "1.8.0",
    language: "EN",
    installed: true,
    hasUpdate: false,
    pinned: false,
  },
  {
    id: "5",
    name: "Webtoons",
    icon: "https://raw.githubusercontent.com/keiyoushi/extensions/main/icons/webtoons.png",
    version: "2.1.0",
    language: "EN",
    installed: false,
    hasUpdate: false,
    pinned: false,
  },
];
