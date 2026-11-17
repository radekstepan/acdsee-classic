/** Static demo library (the original template content) used when the desktop API is absent. */
import type { Folder, Photo } from "./data";

export const demoFolders: Folder[] = [
  { id: "my-computer", name: "My Computer", icon: "computer", parent: null, path: "" },
  { id: "a-floppy", name: "3½ Floppy (A:)", icon: "floppy", parent: "my-computer", path: "" },
  { id: "c-drive", name: "Local Disk (C:)", icon: "drive", parent: "my-computer", hint: "4.00 GB", path: "" },
  { id: "program-files", name: "Program Files", icon: "programs", parent: "c-drive", path: "" },
  { id: "acd-systems", name: "ACD Systems", icon: "folder", parent: "program-files", path: "" },
  { id: "internet-explorer", name: "Internet Explorer", icon: "folder", parent: "program-files", path: "" },
  { id: "windows", name: "WINNT", icon: "folder", parent: "c-drive", path: "" },
  { id: "documents-settings", name: "Documents and Settings", icon: "folder", parent: "c-drive", path: "" },
  { id: "administrator", name: "Administrator", icon: "folder", parent: "documents-settings", path: "" },
  { id: "my-documents", name: "My Documents", icon: "mydocs", parent: "administrator", path: "" },
  { id: "my-pictures", name: "My Pictures", icon: "pictures", parent: "my-documents", path: "" },
  { id: "vacation-2001", name: "Vacation 2001", icon: "folder", parent: "my-pictures", path: "" },
  { id: "family-friends", name: "Family & Friends", icon: "folder", parent: "my-pictures", path: "" },
  { id: "wallpapers", name: "Wallpapers", icon: "folder", parent: "my-pictures", path: "" },
  { id: "scanned-photos", name: "Scanned Photos", icon: "folder", parent: "my-pictures", path: "" },
  { id: "sample-images", name: "Sample Images", icon: "folder", parent: "my-pictures", path: "" },
  { id: "my-music", name: "My Music", icon: "music", parent: "my-documents", path: "" },
  { id: "d-drive", name: "Compact Disc (D:)", icon: "cd", parent: "my-computer", hint: "ACDSee 3.1 CD", path: "" },
  { id: "control-panel", name: "Control Panel", icon: "control", parent: "my-computer", path: "" },
  { id: "my-network", name: "My Network Places", icon: "network", parent: null, path: "" },
  { id: "recycle-bin", name: "Recycle Bin", icon: "recycle", parent: null, path: "" }
];

type Seed = {
  px: number;
  name: string;
  folderId: string;
  width: number;
  height: number;
  kb: number;
  date: string;
  make: string;
  camera: string;
  format?: string;
  rating?: number;
  tags?: string[];
};

const seeds: Seed[] = [
  { px: 13894051, name: "Sunset Over Lake.jpg", folderId: "vacation-2001", width: 1600, height: 1200, kb: 842, date: "2001-07-14T19:42:00", make: "Canon", camera: "Canon PowerShot G1" },
  { px: 40090812, name: "Lake Sail.jpg", folderId: "vacation-2001", width: 1600, height: 1200, kb: 764, date: "2001-07-14T18:16:00", make: "Canon", camera: "Canon PowerShot G1" },
  { px: 11667359, name: "Quiet Morning.jpg", folderId: "vacation-2001", width: 1600, height: 1200, kb: 512, date: "2001-07-15T06:28:00", make: "Nikon", camera: "Nikon Coolpix 990" },
  { px: 11143817, name: "Mountain Mirror.jpg", folderId: "vacation-2001", width: 1600, height: 1200, kb: 688, date: "2001-07-15T20:03:00", make: "Nikon", camera: "Nikon Coolpix 990" },
  { px: 40133180, name: "Alpine Glow.jpg", folderId: "vacation-2001", width: 1600, height: 1200, kb: 902, date: "2001-07-16T21:11:00", make: "Olympus", camera: "Olympus C-3030Z" },
  { px: 27454892, name: "Golden Reeds.jpg", folderId: "vacation-2001", width: 1600, height: 1200, kb: 633, date: "2001-07-16T20:47:00", make: "Olympus", camera: "Olympus C-3030Z" },
  { px: 33544535, name: "Lake Como.jpg", folderId: "vacation-2001", width: 1600, height: 1200, kb: 728, date: "2001-07-17T19:35:00", make: "Canon", camera: "Canon PowerShot G1" },
  { px: 5823136, name: "Dusk at the Water.jpg", folderId: "vacation-2001", width: 1600, height: 1200, kb: 594, date: "2001-07-17T20:58:00", make: "Sony", camera: "Sony DSC-S70" },
  { px: 19779565, name: "Silent Peaks.jpg", folderId: "vacation-2001", width: 1600, height: 1200, kb: 771, date: "2001-07-18T17:22:00", make: "Sony", camera: "Sony DSC-S70" },
  { px: 1437601, name: "Misty Trail.jpg", folderId: "vacation-2001", width: 1200, height: 1600, kb: 456, date: "2001-07-19T09:14:00", make: "Nikon", camera: "Nikon Coolpix 990" },
  { px: 4127415, name: "Piggyback Ride.jpg", folderId: "family-friends", width: 1600, height: 1200, kb: 618, date: "2001-08-04T16:12:00", make: "Kodak", camera: "Kodak DC4800" },
  { px: 8914027, name: "Backyard Picnic.jpg", folderId: "family-friends", width: 1600, height: 1200, kb: 702, date: "2001-08-04T13:36:00", make: "Kodak", camera: "Kodak DC4800" },
  { px: 4555327, name: "Friends at Sunset.jpg", folderId: "family-friends", width: 1600, height: 1200, kb: 489, date: "2001-08-11T19:48:00", make: "Canon", camera: "Canon PowerShot G1" },
  { px: 36713391, name: "Group Photo.jpg", folderId: "family-friends", width: 1600, height: 1200, kb: 677, date: "2001-08-11T15:20:00", make: "Sony", camera: "Sony DSC-S70" },
  { px: 8208689, name: "Sunday in the Park.jpg", folderId: "family-friends", width: 1600, height: 1200, kb: 815, date: "2001-08-19T11:05:00", make: "Nikon", camera: "Nikon Coolpix 990" },
  { px: 697244, name: "Mountain Trip.jpg", folderId: "family-friends", width: 1600, height: 1200, kb: 563, date: "2001-08-25T18:40:00", make: "Olympus", camera: "Olympus C-3030Z" },
  { px: 10044373, name: "Sack Race.jpg", folderId: "family-friends", width: 1600, height: 1200, kb: 745, date: "2001-09-01T14:17:00", make: "Kodak", camera: "Kodak DC4800" },
  { px: 4555326, name: "Running Free.jpg", folderId: "family-friends", width: 1600, height: 1200, kb: 521, date: "2001-09-01T16:52:00", make: "Fujifilm", camera: "FinePix 4700Z" },
  { px: 37568054, name: "Pink Gladiolus.jpg", folderId: "wallpapers", width: 1600, height: 1200, kb: 398, date: "2002-03-22T10:31:00", make: "Nikon", camera: "Nikon Coolpix 990" },
  { px: 12080620, name: "Dahlia Study.jpg", folderId: "wallpapers", width: 1600, height: 1200, kb: 412, date: "2002-03-22T10:44:00", make: "Nikon", camera: "Nikon Coolpix 990" },
  { px: 27353932, name: "Portulaca.jpg", folderId: "wallpapers", width: 1600, height: 1200, kb: 436, date: "2002-03-23T09:12:00", make: "Canon", camera: "Canon PowerShot G1" },
  { px: 40266327, name: "Orange Blossoms.jpg", folderId: "wallpapers", width: 1600, height: 1200, kb: 371, date: "2002-03-23T09:27:00", make: "Canon", camera: "Canon PowerShot G1" },
  { px: 30323953, name: "Gazania.jpg", folderId: "wallpapers", width: 1200, height: 1600, kb: 455, date: "2002-03-24T11:02:00", make: "Olympus", camera: "Olympus C-3030Z" },
  { px: 35142333, name: "Foggy Path.jpg", folderId: "wallpapers", width: 1600, height: 1200, kb: 603, date: "2002-10-19T08:22:00", make: "Fujifilm", camera: "FinePix 4700Z" },
  { px: 34632989, name: "Autumn Gold.jpg", folderId: "wallpapers", width: 1600, height: 1200, kb: 645, date: "2002-10-19T09:06:00", make: "Fujifilm", camera: "FinePix 4700Z" },
  { px: 14309274, name: "Forest Light.jpg", folderId: "wallpapers", width: 1600, height: 1200, kb: 588, date: "2002-10-20T15:41:00", make: "Sony", camera: "Sony DSC-S70" },
  { px: 32345615, name: "Cocker Spaniel.jpg", folderId: "scanned-photos", width: 1120, height: 1400, kb: 264, date: "1999-11-08T12:00:00", make: "Hewlett-Packard", camera: "HP PhotoSmart S20", format: "JPEG", tags: ["scanned", "dogs"] },
  { px: 4364610, name: "Barn Cat.jpg", folderId: "scanned-photos", width: 1400, height: 1100, kb: 228, date: "1999-11-08T12:04:00", make: "Hewlett-Packard", camera: "HP PhotoSmart S20", tags: ["scanned", "cats"] },
  { px: 10873296, name: "Tabby Portrait.jpg", folderId: "scanned-photos", width: 1120, height: 1400, kb: 246, date: "1999-11-08T12:07:00", make: "Hewlett-Packard", camera: "HP PhotoSmart S20", tags: ["scanned", "cats"] },
  { px: 18500759, name: "Little Dog.jpg", folderId: "scanned-photos", width: 1120, height: 1400, kb: 198, date: "2000-02-14T10:20:00", make: "Epson", camera: "Epson PhotoPC 3000Z", tags: ["scanned", "dogs"] },
  { px: 32762927, name: "Ginger.jpg", folderId: "scanned-photos", width: 1400, height: 1100, kb: 312, date: "2000-02-14T10:26:00", make: "Epson", camera: "Epson PhotoPC 3000Z", tags: ["cats"] },
  { px: 358345, name: "Old Street (B&W).jpg", folderId: "scanned-photos", width: 1400, height: 1000, kb: 187, date: "1998-06-30T16:10:00", make: "Hewlett-Packard", camera: "HP PhotoSmart S20", tags: ["scanned", "architecture"] },
  { px: 37871412, name: "Classic Cars.jpg", folderId: "sample-images", width: 1600, height: 1200, kb: 712, date: "2002-05-18T10:12:00", make: "Canon", camera: "Canon PowerShot G1" },
  { px: 11439335, name: "Red Roadster.jpg", folderId: "sample-images", width: 1600, height: 1200, kb: 684, date: "2002-05-18T11:30:00", make: "Canon", camera: "Canon PowerShot G1" },
  { px: 11351028, name: "Blue Coupe.jpg", folderId: "sample-images", width: 1600, height: 1200, kb: 553, date: "2002-05-18T12:04:00", make: "Olympus", camera: "Olympus C-3030Z" },
  { px: 9282736, name: "Vintage Show.jpg", folderId: "sample-images", width: 1600, height: 1200, kb: 627, date: "2002-05-19T09:48:00", make: "Nikon", camera: "Nikon Coolpix 990" },
  { px: 39813049, name: "Steering Wheel.jpg", folderId: "sample-images", width: 1600, height: 1200, kb: 398, date: "2002-05-19T10:15:00", make: "Nikon", camera: "Nikon Coolpix 990" },
  { px: 26795218, name: "Warsaw Facade.jpg", folderId: "sample-images", width: 1200, height: 1600, kb: 441, date: "2002-06-02T14:22:00", make: "Sony", camera: "Sony DSC-S70" },
  { px: 36790029, name: "Medieval Street.jpg", folderId: "sample-images", width: 1600, height: 1200, kb: 576, date: "2002-06-03T08:55:00", make: "Sony", camera: "Sony DSC-S70" },
  { px: 37969727, name: "Bruges Canal.jpg", folderId: "sample-images", width: 1600, height: 1200, kb: 609, date: "2002-06-04T17:38:00", make: "Kodak", camera: "Kodak DC4800" },
  { px: 37511454, name: "Tangerines.jpg", folderId: "recycle-bin", width: 1600, height: 1200, kb: 371, date: "2002-01-18T13:28:00", make: "Nikon", camera: "Nikon Coolpix 990" },
  { px: 7372261, name: "Cherries.jpg", folderId: "recycle-bin", width: 1600, height: 1200, kb: 462, date: "2002-01-18T13:36:00", make: "Nikon", camera: "Nikon Coolpix 990" },
  { px: 6794882, name: "Peaches.jpg", folderId: "recycle-bin", width: 1600, height: 1200, kb: 349, date: "2002-01-18T13:42:00", make: "Canon", camera: "Canon PowerShot G1" }
];

const exposures = ["1/250 sec", "1/125 sec", "1/500 sec", "1/60 sec", "1/320 sec", "1/180 sec"];
const apertures = ["f/5.6", "f/4.0", "f/8.0", "f/2.8", "f/11"];
const focals = ["7 mm", "8 mm", "12 mm", "16 mm", "21 mm"];

export const demoPhotos: Photo[] = seeds.map((s, i) => ({
  id: `p-${s.px}`,
  name: s.name,
  folderId: s.folderId,
  src: `photos/${s.px}.jpg`,
  fullSrc: `photos/${s.px}.jpg`,
  path: "",
  width: s.width,
  height: s.height,
  size: Math.round(s.kb * 1024 + (i * 137) % 700),
  date: s.date,
  camera: s.camera,
  make: s.make,
  exposure: exposures[i % exposures.length],
  aperture: apertures[i % apertures.length],
  iso: [100, 100, 80, 200, 100, 64][i % 6],
  focal: focals[i % focals.length],
  flash: i % 4 === 0 ? "Yes" : "No",
  format: s.format ?? "JPEG",
  rotation: 0,
  flipped: false,
  rating: 0,
  tags: s.tags ?? ["photos"]
}));
