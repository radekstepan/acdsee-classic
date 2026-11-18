/**
 * Static demo library used in browser/demo mode (there is no filesystem there).
 *
 * The tree mirrors the original ACDSee template library: a Windows 98 desktop,
 * a small C: drive of photo folders, the ACDSee sample CD in D:, a network
 * share and a recycle bin.
 */
import { demoPhotoUrl } from "./data/catalog";
import type { ExifEntry, FileEntry, Folder, FolderIcon, FolderKind } from "./types";
import { defaultEdit } from "./utils/util";

type DateSpec = [year: number, month: number, day: number, hour: number, minute: number];

interface FileSpec {
  name: string;
  ext: string;
  date: DateSpec;
  desc?: string;
  keywords?: string;
  exif?: ExifEntry;
  deletedFrom?: string;
}

interface FolderSpec {
  id: string;
  name: string;
  parent: string | null;
  kind: FolderKind;
  icon?: FolderIcon;
  drive?: string;
  notReady?: boolean;
  files?: FileSpec[];
}

const DIMENSIONS: readonly (readonly [number, number])[] = [
  [1600, 1200],
  [1200, 1600],
  [800, 600],
  [640, 480],
];

const BPP: Record<string, number> = {
  jpg: 24,
  gif: 8,
  bmp: 24,
  png: 24,
  tif: 24,
  pcx: 8,
  tga: 24,
};

const timestamp = (date: DateSpec): number =>
  new Date(date[0], date[1] - 1, date[2], date[3], date[4], 0).getTime();

function sizeFor(ext: string, w: number, h: number, seed: number): number {
  const px = w * h;
  switch (ext) {
    case "bmp":
      return px * 3 + 54;
    case "gif":
      return Math.round(px * (0.32 + (seed % 20) / 100));
    case "png":
      return Math.round(px * (1.1 + (seed % 40) / 100));
    case "tif":
      return Math.round(px * 2.1 + 8192);
    case "pcx":
      return Math.round(px * 1.05);
    case "tga":
      return px * 3 + 18;
    default:
      return Math.round(px * (0.2 + (seed % 30) / 100)) + 1500;
  }
}

function buildFolders(specs: FolderSpec[]): Record<string, Folder> {
  const folders: Record<string, Folder> = {};
  let uid = 1;
  let photo = 0;

  const makeFile = (folderId: string, spec: FileSpec): FileEntry => {
    const index = uid++;
    const [w, h] = DIMENSIONS[(index - 1) % DIMENSIONS.length];
    const modified = timestamp(spec.date);
    const file: FileEntry = {
      id: `f${index}`,
      name: spec.name,
      ext: spec.ext,
      path: "",
      src: demoPhotoUrl(photo),
      fullSrc: demoPhotoUrl(photo),
      folderId,
      size: sizeFor(spec.ext, w, h, index),
      w,
      h,
      bpp: BPP[spec.ext] ?? 24,
      created: modified - (3 + (index % 200)) * 60000,
      modified,
      accessed: modified + (1 + (index % 9)) * 86400000,
      attrs: { r: false, h: false, a: true },
      edit: { ...defaultEdit },
      desc: spec.desc ?? "",
      keywords: spec.keywords ?? "",
      rating: 0,
      exif: spec.exif ?? {},
    };
    photo += 1;
    if (spec.deletedFrom) file.deletedFrom = spec.deletedFrom;
    return file;
  };

  for (const spec of specs) {
    const folder: Folder = {
      id: spec.id,
      name: spec.name,
      parent: spec.parent,
      kind: spec.kind,
      children: [],
      files: (spec.files ?? []).map((file) => makeFile(spec.id, file)),
      path: "",
    };
    if (spec.icon) folder.icon = spec.icon;
    if (spec.drive) folder.drive = spec.drive;
    if (spec.notReady) folder.notReady = spec.notReady;
    folders[spec.id] = folder;
  }

  for (const spec of specs) {
    if (spec.parent) folders[spec.parent].children.push(spec.id);
  }

  return folders;
}

export const demoFolders: Record<string, Folder> = buildFolders([
  // Desktop / My Computer
  { id: "desktop", name: "Desktop", parent: null, kind: "desktop" },
  { id: "mycomputer", name: "My Computer", parent: "desktop", kind: "computer", icon: "computer" },
  {
    id: "a",
    name: "3½ Floppy (A:)",
    parent: "mycomputer",
    kind: "floppy",
    icon: "floppy",
    drive: "A",
    notReady: true,
  },
  { id: "c", name: "Win98 (C:)", parent: "mycomputer", kind: "hdd", icon: "drive", drive: "C" },
  {
    id: "d",
    name: "PHOTO_CD (D:)",
    parent: "mycomputer",
    kind: "cdrom",
    icon: "cd",
    drive: "D",
    files: [
      { name: "SAMPLE01", ext: "jpg", date: [1999, 3, 2, 10, 0], desc: "Cover shot from the sample CD." },
      { name: "SAMPLE02", ext: "jpg", date: [1999, 3, 2, 10, 5], keywords: "sample, lake" },
      { name: "SAMPLE03", ext: "jpg", date: [1999, 3, 2, 10, 9], keywords: "sample, harbour" },
    ],
  },
  {
    id: "holiday",
    name: "Holiday",
    parent: "d",
    kind: "folder",
    files: [
      { name: "HOL001", ext: "jpg", date: [1999, 6, 20, 9, 10], desc: "First morning of the holiday." },
      { name: "HOL002", ext: "jpg", date: [1999, 6, 20, 9, 14], keywords: "holiday, morning" },
      { name: "HOL003", ext: "jpg", date: [1999, 6, 21, 13, 40], desc: "Picnic lunch by the river." },
      { name: "HOL004", ext: "jpg", date: [1999, 6, 22, 16, 5], keywords: "holiday, coast" },
      { name: "HOL005", ext: "jpg", date: [1999, 6, 23, 8, 30], desc: "Snow still on the range in June." },
    ],
  },

  // C:\My Documents
  { id: "mydocs", name: "My Documents", parent: "c", kind: "folder", icon: "mydocs" },
  { id: "mypics", name: "My Pictures", parent: "mydocs", kind: "folder", icon: "pictures" },
  {
    id: "nature",
    name: "Nature",
    parent: "mypics",
    kind: "folder",
    files: [
      {
        name: "Alpine Sunset",
        ext: "jpg",
        date: [1999, 8, 12, 18, 41],
        desc: "Lake in the Alps just after the sun dropped behind the ridge.",
        keywords: "alps, sunset, lake",
        exif: {
          make: "Olympus",
          model: "C-2020Z",
          exposure: "1/250 sec",
          aperture: "f/5.6",
          iso: 100,
          focal: "6.5 mm",
          flash: "Flash did not fire",
        },
      },
      {
        name: "Foggy Lake",
        ext: "jpg",
        date: [1999, 9, 3, 7, 12],
        desc: "Morning mist sitting on the water, shot from the north shore.",
        keywords: "mist, lake",
      },
      { name: "Autumn Hills", ext: "jpg", date: [1999, 10, 17, 15, 20], keywords: "autumn, hills" },
      {
        name: "Autumn Woods",
        ext: "jpg",
        date: [1999, 10, 17, 15, 44],
        desc: "Maple canopy at the end of October.",
        keywords: "autumn, forest",
      },
      {
        name: "Forest Falls",
        ext: "jpg",
        date: [2000, 5, 21, 11, 5],
        desc: "Long exposure of the falls below the trail bridge.",
        keywords: "waterfall, forest",
      },
      { name: "Rocky Falls", ext: "jpg", date: [2000, 5, 21, 11, 31], keywords: "waterfall, rock" },
      {
        name: "Snow Peaks",
        ext: "jpg",
        date: [2000, 1, 8, 10, 2],
        desc: "Fresh snow on the north ridge.",
        keywords: "snow, mountains",
        exif: {
          make: "NIKON",
          model: "COOLPIX 950",
          exposure: "1/500 sec",
          aperture: "f/8.0",
          iso: 80,
          focal: "9.4 mm",
          flash: "Flash did not fire",
        },
      },
      { name: "Snow Range", ext: "jpg", date: [2000, 1, 8, 10, 19], keywords: "snow, mountains" },
      { name: "Sand Dunes", ext: "jpg", date: [2000, 7, 30, 17, 55], keywords: "desert, dunes" },
      {
        name: "Namib Dunes",
        ext: "jpg",
        date: [2000, 7, 30, 18, 10],
        desc: "Late afternoon shadows across the dune crests.",
        keywords: "desert, dunes",
      },
      { name: "Purple Tulips", ext: "tif", date: [2001, 4, 22, 13, 0], keywords: "flowers, tulips" },
      { name: "Tulip Garden", ext: "jpg", date: [2001, 4, 22, 13, 20], keywords: "flowers, garden" },
      {
        name: "Monarch",
        ext: "gif",
        date: [2001, 6, 2, 12, 35],
        desc: "Monarch butterfly on the buddleia by the back fence.",
        keywords: "butterfly, macro",
      },
      { name: "Meadow Visitor", ext: "png", date: [2001, 6, 2, 12, 41], keywords: "butterfly, meadow" },
      { name: "Beach Dusk", ext: "jpg", date: [1999, 8, 14, 20, 3], keywords: "beach, dusk" },
      {
        name: "Ocean Sunset",
        ext: "bmp",
        date: [1999, 8, 14, 20, 21],
        desc: "Sun going down behind the breakwater.",
        keywords: "ocean, sunset",
      },
    ],
  },
  {
    id: "pets",
    name: "Pets",
    parent: "mypics",
    kind: "folder",
    files: [
      {
        name: "Tiger",
        ext: "jpg",
        date: [2000, 3, 11, 14, 22],
        desc: "Tiger asleep on the warm monitor.",
        keywords: "cat, tabby",
        exif: {
          make: "KODAK",
          model: "DC280 ZOOM",
          exposure: "1/60 sec",
          aperture: "f/3.5",
          iso: 100,
          focal: "7.2 mm",
          flash: "Flash fired",
        },
      },
      { name: "Ginger", ext: "jpg", date: [2000, 3, 19, 9, 48], keywords: "cat" },
      {
        name: "Rex at the Lake",
        ext: "jpg",
        date: [2001, 8, 5, 16, 10],
        desc: "Rex shaking off after his first swim.",
        keywords: "dog, lake",
      },
      { name: "Buddy", ext: "jpg", date: [2001, 5, 27, 11, 33], desc: "Buddy waiting by the back door.", keywords: "dog" },
    ],
  },
  {
    id: "family",
    name: "Family",
    parent: "mypics",
    kind: "folder",
    files: [
      {
        name: "MVC-001F",
        ext: "jpg",
        date: [2000, 7, 4, 13, 15],
        desc: "Fourth of July picnic in the backyard.",
        keywords: "family, picnic",
      },
      { name: "MVC-002F", ext: "jpg", date: [2000, 7, 4, 13, 52], keywords: "family, picnic" },
      {
        name: "MVC-003F",
        ext: "jpg",
        date: [2000, 7, 4, 15, 8],
        desc: "The kids in the sprinkler.",
        keywords: "family, summer",
      },
    ],
  },
  {
    id: "vacation",
    name: "Vacation 1999",
    parent: "mypics",
    kind: "folder",
    files: [
      {
        name: "DSCN0412",
        ext: "jpg",
        date: [1999, 7, 9, 10, 45],
        desc: "Golden Gate from the south end of the bridge.",
        keywords: "vacation, bridge",
        exif: {
          make: "SONY",
          model: "Mavica MVC-FD88",
          exposure: "1/125 sec",
          aperture: "f/4.0",
          iso: 100,
          focal: "12 mm",
          flash: "Flash did not fire",
        },
      },
      { name: "DSCN0415", ext: "jpg", date: [1999, 7, 9, 11, 30], keywords: "vacation, marina" },
      { name: "DSCN0418", ext: "jpg", date: [1999, 7, 10, 14, 2], keywords: "vacation" },
      {
        name: "DSCN0431",
        ext: "jpg",
        date: [1999, 7, 11, 21, 17],
        desc: "City skyline from the ferry at night.",
        keywords: "night, skyline",
      },
      {
        name: "DSCN0440",
        ext: "jpg",
        date: [1999, 7, 12, 16, 40],
        desc: "Lighthouse at the end of the coast road.",
        keywords: "lighthouse, coast",
      },
    ],
  },
  {
    id: "balloons",
    name: "Balloon Fiesta",
    parent: "vacation",
    kind: "folder",
    files: [
      {
        name: "Balloon 01",
        ext: "jpg",
        date: [1999, 10, 3, 8, 12],
        desc: "Launch field at dawn, first wave of balloons.",
        keywords: "balloons, fiesta",
      },
      { name: "Balloon 02", ext: "jpg", date: [1999, 10, 3, 6, 41], keywords: "balloons, dawn" },
    ],
  },
  {
    id: "coast",
    name: "Coast Highway",
    parent: "vacation",
    kind: "folder",
    files: [
      {
        name: "P7210001",
        ext: "jpg",
        date: [1999, 7, 21, 18, 12],
        desc: "Cliff road above the water.",
        keywords: "coast, highway",
      },
      {
        name: "P7210007",
        ext: "jpg",
        date: [1999, 7, 21, 18, 40],
        desc: "Beetle parked at the overlook.",
        keywords: "car, coast",
      },
      { name: "P7210015", ext: "jpg", date: [1999, 7, 22, 22, 3], keywords: "night, city" },
    ],
  },
  {
    id: "cities",
    name: "Cities",
    parent: "mypics",
    kind: "folder",
    files: [
      { name: "Golden Gate", ext: "png", date: [2000, 2, 14, 9, 0], keywords: "bridge, san francisco" },
      {
        name: "Skyline",
        ext: "jpg",
        date: [2000, 2, 14, 21, 10],
        desc: "Financial district seen from the bay.",
        keywords: "city, skyline",
      },
      { name: "Austin", ext: "jpg", date: [2000, 2, 15, 20, 30], keywords: "city, texas" },
      {
        name: "Hamburg",
        ext: "tga",
        date: [2000, 2, 16, 12, 12],
        desc: "Harbour warehouses on a grey afternoon.",
        keywords: "harbour, germany",
      },
      { name: "Marina", ext: "jpg", date: [2000, 2, 17, 15, 45], keywords: "boats, marina" },
    ],
  },
  {
    id: "wallpapers",
    name: "Wallpapers",
    parent: "mypics",
    kind: "folder",
    files: [
      { name: "Mountain Lake", ext: "bmp", date: [1999, 11, 1, 8, 0], keywords: "wallpaper, lake" },
      { name: "Woods", ext: "bmp", date: [1999, 11, 1, 8, 4], keywords: "wallpaper, forest" },
      { name: "Tulips", ext: "bmp", date: [1999, 11, 1, 8, 7], keywords: "wallpaper, flowers" },
      { name: "Sunset", ext: "bmp", date: [1999, 11, 1, 8, 9], keywords: "wallpaper, sunset" },
      {
        name: "Snowfall",
        ext: "jpg",
        date: [2000, 12, 20, 18, 0],
        desc: "First snow of the winter, shot from the porch.",
        keywords: "winter, snow",
      },
      { name: "Desert", ext: "jpg", date: [2000, 12, 20, 18, 5], keywords: "desert, dunes" },
      { name: "Tiger Eyes", ext: "jpg", date: [2001, 1, 3, 10, 5], keywords: "cat, wallpaper" },
    ],
  },
  { id: "letters", name: "Letters", parent: "mydocs", kind: "folder" },
  { id: "budget", name: "Budget", parent: "mydocs", kind: "folder" },

  // C:\Program Files
  { id: "progfiles", name: "Program Files", parent: "c", kind: "folder", icon: "programs" },
  { id: "acd", name: "ACD Systems", parent: "progfiles", kind: "folder" },
  { id: "acdsee", name: "ACDSee32", parent: "acd", kind: "folder" },
  {
    id: "samples",
    name: "Samples",
    parent: "acdsee",
    kind: "folder",
    files: [
      { name: "tulips", ext: "jpg", date: [1998, 12, 1, 12, 0], desc: "Sample image shipped with ACDSee 3.0.", keywords: "sample" },
      { name: "fall", ext: "jpg", date: [1998, 12, 1, 12, 1], keywords: "sample, autumn" },
      { name: "mist", ext: "jpg", date: [1998, 12, 1, 12, 2], keywords: "sample, lake" },
      { name: "falls", ext: "jpg", date: [1998, 12, 1, 12, 3], keywords: "sample, waterfall" },
      { name: "butterfly", ext: "gif", date: [1998, 12, 1, 12, 4], keywords: "sample, butterfly" },
      { name: "bridge", ext: "jpg", date: [1998, 12, 1, 12, 5], keywords: "sample, bridge" },
    ],
  },
  { id: "accessories", name: "Accessories", parent: "progfiles", kind: "folder" },
  { id: "ie", name: "Internet Explorer", parent: "progfiles", kind: "folder" },

  // C:\Windows
  { id: "windows", name: "Windows", parent: "c", kind: "folder" },
  { id: "winsys", name: "System", parent: "windows", kind: "folder" },
  { id: "winfonts", name: "Fonts", parent: "windows", kind: "folder" },
  { id: "winhelp", name: "Help", parent: "windows", kind: "folder" },
  { id: "winstart", name: "Start Menu", parent: "windows", kind: "folder" },
  {
    id: "temp",
    name: "Temp",
    parent: "c",
    kind: "folder",
    files: [
      { name: "TMP0001", ext: "bmp", date: [2001, 9, 14, 23, 11], keywords: "temp" },
      {
        name: "scan0007",
        ext: "jpg",
        date: [2001, 9, 15, 8, 20],
        desc: "Half-finished scan, kept for reference.",
        keywords: "scan, temp",
      },
    ],
  },

  // Network
  { id: "network", name: "Network Neighborhood", parent: "desktop", kind: "network", icon: "network" },
  { id: "entirenet", name: "Entire Network", parent: "network", kind: "network", icon: "network" },
  { id: "dadpc", name: "Dad-PC", parent: "network", kind: "netpc" },
  {
    id: "dadphotos",
    name: "Photos",
    parent: "dadpc",
    kind: "folder",
    files: [
      {
        name: "Dad Fishing Trip 1",
        ext: "jpg",
        date: [1999, 9, 25, 7, 0],
        desc: "Early start on the river.",
        keywords: "fishing, family",
      },
      { name: "Dad Fishing Trip 2", ext: "jpg", date: [1999, 9, 25, 8, 30], keywords: "fishing" },
      { name: "Reunion 99", ext: "jpg", date: [1999, 8, 1, 14, 0], keywords: "family, reunion" },
      { name: "Ski Trip", ext: "jpg", date: [2000, 2, 12, 11, 0], keywords: "ski, winter" },
    ],
  },

  // Recycle Bin
  {
    id: "recycle",
    name: "Recycle Bin",
    parent: "desktop",
    kind: "recycle",
    icon: "recycle",
    files: [
      {
        name: "blurry shot",
        ext: "jpg",
        date: [2001, 9, 1, 10, 0],
        desc: "Out of focus, deleted.",
        deletedFrom: "mypics",
      },
      { name: "old cat", ext: "gif", date: [2001, 8, 30, 17, 0], deletedFrom: "mypics" },
    ],
  },
]);

/** Folder opened when the demo library boots. */
export const DEMO_START_FOLDER = "nature";
