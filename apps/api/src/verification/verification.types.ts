export type AccountVerificationStatus =
  | "none"
  | "enrolled"
  | "pending_review"
  | "verified"
  | "rejected";

export type VerificationCaptureSlot = "selfie" | "id-front" | "id-back";

export const VERIFICATION_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const CAPTURE_SESSION_TTL_MIN = 30;

export type VerificationStatusDto = {
  status: AccountVerificationStatus;
  rejectionReason: string | null;
  legalNameMasked: string | null;
  phoneMasked: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
};

export type CaptureSessionPollDto = {
  sessionId: string;
  selfie: boolean;
  idFront: boolean;
  idBack: boolean;
  complete: boolean;
  expiresAt: string;
};

export type CaptureSessionCreateDto = {
  sessionId: string;
  captureUrl: string;
  expiresAt: string;
};

export type PublicCaptureStatusDto = {
  valid: boolean;
  expiresAt: string | null;
  slots: {
    selfie: boolean;
    idFront: boolean;
    idBack: boolean;
  };
};

export type VerificationReviewImageUrls = {
  selfie: string | null;
  idFront: string | null;
  idBack: string | null;
};
