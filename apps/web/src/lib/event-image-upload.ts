/** Must match `EVENT_IMAGE_MAX_BYTES` in apps/api/src/events/events.service.ts */
export const EVENT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

export const EVENT_IMAGE_MAX_MB = 10;

export function isEventImageWithinSizeLimit(file: File): boolean {
  return file.size <= EVENT_IMAGE_MAX_BYTES;
}
