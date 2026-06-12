export type AccountVerificationStatus =
  | "none"
  | "enrolled"
  | "pending_review"
  | "verified"
  | "rejected";

export type VerificationStatus = {
  status: AccountVerificationStatus;
  rejectionReason: string | null;
  legalNameMasked: string | null;
  phoneMasked: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
};

export type CaptureSessionCreate = {
  sessionId: string;
  captureUrl: string;
  expiresAt: string;
};

export type CaptureSessionPoll = {
  sessionId: string;
  selfie: boolean;
  idFront: boolean;
  idBack: boolean;
  complete: boolean;
  expiresAt: string;
};

export type PublicCaptureStatus = {
  valid: boolean;
  expiresAt: string | null;
  slots: {
    selfie: boolean;
    idFront: boolean;
    idBack: boolean;
  };
};
