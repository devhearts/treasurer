import {
  buildVerificationReviewImageUrl,
  VERIFICATION_REVIEW_IMAGE_TTL_SEC,
  signVerificationReviewToken,
  verifyVerificationReviewToken,
} from "./verification-review-token";

describe("verification review image tokens", () => {
  const secret = "test-secret";
  const userId = "5d44911f-7183-47f3-a169-5b51c2eb8091";

  it("signs and verifies a review link", () => {
    const exp = Math.floor(Date.now() / 1000) + VERIFICATION_REVIEW_IMAGE_TTL_SEC;
    const sig = signVerificationReviewToken(userId, "selfie", exp, secret);
    expect(
      verifyVerificationReviewToken(userId, "selfie", exp, sig, secret)
    ).toBe(true);
  });

  it("rejects expired links", () => {
    const exp = Math.floor(Date.now() / 1000) - 10;
    const sig = signVerificationReviewToken(userId, "selfie", exp, secret);
    expect(
      verifyVerificationReviewToken(userId, "selfie", exp, sig, secret)
    ).toBe(false);
  });

  it("builds BFF-proxied review URLs", () => {
    const url = buildVerificationReviewImageUrl(
      "http://localhost:3030",
      userId,
      "idFront",
      secret
    );
    expect(url).toMatch(
      /^http:\/\/localhost:3030\/api\/v1\/verification\/review\//
    );
    expect(url).toContain("exp=");
    expect(url).toContain("sig=");
  });
});
