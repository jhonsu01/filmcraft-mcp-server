/** FilmCraft time base: every time in the engine is an integer number of ticks. */
export const TICKS_PER_SECOND = 254_016_000_000;

export function toTicks(seconds: number): number {
  return Math.round(seconds * TICKS_PER_SECOND);
}

export function toSeconds(ticks: number): number {
  return ticks / TICKS_PER_SECOND;
}

/** Media FilmCraft imports (used to pick files from an input folder; the engine reports anything it rejects). */
export const VIDEO_INPUT_EXTENSIONS = [
  'mp4', 'm4v', 'mov', 'qt', 'mkv', 'webm', 'avi', 'mxf', 'mts', 'm2ts', 'ts', 'mpg', 'mpeg', 'wmv', 'flv', '3gp', 'ogv', 'gif',
];
export const AUDIO_INPUT_EXTENSIONS = ['wav', 'bwf', 'mp3', 'flac', 'aif', 'aiff', 'ogg', 'oga', 'opus', 'm4a', 'aac', 'wma', 'caf', 'w64'];
export const IMAGE_INPUT_EXTENSIONS = ['png', 'jpg', 'jpeg', 'tif', 'tiff', 'bmp', 'webp', 'exr', 'dpx', 'tga', 'psd', 'heic'];
export const INPUT_EXTENSIONS = [...VIDEO_INPUT_EXTENSIONS, ...AUDIO_INPUT_EXTENSIONS, ...IMAGE_INPUT_EXTENSIONS];

/** Export formats of `file.exportMedia` and the extension each one writes. */
export const EXPORT_FORMATS = {
  h264: 'mp4',
  prores: 'mov',
  dnxhr: 'mov',
  mjpeg: 'mov',
  'mxf-op1a': 'mxf',
  'mxf-opatom': 'mxf',
  png: 'png',
  tiff: 'tif',
  bmp: 'bmp',
  gif: 'gif',
  wav: 'wav',
  aiff: 'aif',
} as const;

export type ExportFormat = keyof typeof EXPORT_FORMATS;
export const EXPORT_FORMAT_IDS = Object.keys(EXPORT_FORMATS) as [ExportFormat, ...ExportFormat[]];
export const AUDIO_ONLY_FORMATS: ExportFormat[] = ['wav', 'aiff'];

/** Guess the export format from an output file extension. */
export function formatFromExtension(ext: string): ExportFormat | undefined {
  const e = ext.replace(/^\./, '').toLowerCase();
  const map: Record<string, ExportFormat> = {
    mp4: 'h264', m4v: 'h264', mov: 'prores', mxf: 'mxf-op1a', png: 'png', tif: 'tiff', tiff: 'tiff', bmp: 'bmp',
    gif: 'gif', wav: 'wav', aif: 'aiff', aiff: 'aiff',
  };
  return map[e];
}

/** Editable (re-openable) outputs: the native project plus interchange timelines for other editors. */
export const INTERCHANGE_FORMATS = {
  otio: 'otio',
  fcpxml: 'fcpxml',
  xml: 'xml',
  edl: 'edl',
  aaf: 'aaf',
} as const;
export type InterchangeFormat = keyof typeof INTERCHANGE_FORMATS;
export const INTERCHANGE_FORMAT_IDS = Object.keys(INTERCHANGE_FORMATS) as [InterchangeFormat, ...InterchangeFormat[]];

/** Built-in default for video when neither preset nor format is given. */
export const DEFAULT_VIDEO_PRESET = 'Match Source – Adaptive High Bitrate';

/** Clip effects every video clip already carries (set them, never apply them). */
export const INTRINSIC_VIDEO_EFFECTS = ['motion', 'opacity', 'time_remap'];
export const INTRINSIC_AUDIO_EFFECTS = ['volume', 'channel_volume', 'panner'];
