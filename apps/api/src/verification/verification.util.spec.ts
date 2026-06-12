import {
  maskLegalName,
  maskPhoneMsisdn,
  parseCaptureSlot,
  validateVerificationImage,
} from "./verification.util";

describe("verification.util", () => {
  it("masks legal name", () => {
    expect(maskLegalName("Jane Mary Okello")).toBe("Jane O***");
    expect(maskLegalName("Jane")).toBe("J**e");
  });

  it("masks phone msisdn", () => {
    expect(maskPhoneMsisdn("256771234567")).toBe("***4567");
  });

  it("parses capture slots", () => {
    expect(parseCaptureSlot("selfie")).toBe("selfie");
    expect(parseCaptureSlot("id-front")).toBe("id-front");
    expect(parseCaptureSlot("invalid")).toBeNull();
  });

  it("rejects invalid image types", () => {
    expect(() =>
      validateVerificationImage(Buffer.from("x"), "application/pdf")
    ).toThrow(/camera images/i);
  });

  it("accepts jpeg images within size limit", () => {
    expect(() =>
      validateVerificationImage(Buffer.alloc(100), "image/jpeg")
    ).not.toThrow();
  });
});
