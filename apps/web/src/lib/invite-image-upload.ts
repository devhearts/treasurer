/** Must match multer limit on POST /invitations/:id/photo */
export const INVITE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const INVITE_IMAGE_MAX_MB = 5;

export function isInviteImageWithinSizeLimit(file: File): boolean {
  return file.size <= INVITE_IMAGE_MAX_BYTES;
}
