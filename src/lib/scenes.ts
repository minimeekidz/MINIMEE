// The scene art, indexed by the name Em gives it.
//
// Every scene used to arrive as 小鎮中心_日_9x16.webp and get renamed to
// town-centre-day.webp on the way in, with a script holding the mapping. That
// mapping was one more thing that could be wrong, and it was: for a week the
// game ran on an old 小鎮中心 while the new one sat in the repo under a name
// nothing looked for, and the report said the art had never been sent.
//
// So the mapping is gone. Em's filename is the filename, the way it already
// works for the 36 cinema posters and the 144 stickers: 「檔名跟返上面，push
// 上 GitHub 就自動接，唔使改任何 code」. To replace a scene, overwrite the file
// with the same name. To see what the game is running on, read the folder.
//
// The two tokens in a name are what the art actually varies by:
//
//   日 / 夜      only for scenes that can tell — outdoors, or a room with a
//                window. 戲院1號廳 has no window and no 夜 cut.
//   9x16 / 16x9  portrait for phones, landscape for tablets. Separate renders
//                rather than crops, which is why they cannot share hotspot
//                coordinates.

/** A scene, as it is named on disk. */
export interface Scene {
  /** The Chinese name, exactly as the file is called. */
  base: string;
  /** Whether this scene has a 夜 cut. Interiors with no window do not. */
  lit: boolean;
}

export const SCENES = {
  townCentre: { base: "小鎮中心", lit: true },
  townSquare: { base: "小鎮廣場", lit: true },
  seasidePark: { base: "散步公園", lit: true },
  villageGate: { base: "小屋區入口", lit: true },
  wharfMarket: { base: "碼頭市集", lit: true },
  myHome: { base: "我的小屋", lit: true },
  cafe: { base: "Buddy_Cafe", lit: true },
  studio: { base: "Hero_Studio", lit: true },
  library: { base: "MEE圖書館", lit: true },
  cinemaLobby: { base: "戲院大堂", lit: false },
  cinemaHall: { base: "戲院1號廳", lit: false },
  cinemaHall2: { base: "戲院2號廳", lit: false },
  albumHall: { base: "MEE珍藏館", lit: false },
  albumBooks: { base: "MEE卡冊展示室", lit: false },
  fragmentRoom: { base: "MEE碎片收集室", lit: false },
} as const satisfies Record<string, Scene>;

export type SceneKey = keyof typeof SCENES;

/**
 * The path to one cut of a scene.
 *
 * Asking for 夜 on a scene with no night cut returns the day file rather than
 * a 404: 戲院大堂 is lit the same at midnight, and the caller should not have
 * to know which rooms have windows.
 */
export function sceneArt(
  scene: Scene,
  { night = false, wide = false }: { night?: boolean; wide?: boolean } = {},
): string {
  const light = scene.lit ? (night ? "_夜" : "_日") : "";
  const aspect = wide ? "16x9" : "9x16";
  return `/assets/world/${scene.base}${light}_${aspect}.webp`;
}
