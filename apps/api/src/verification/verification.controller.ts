import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { SessionGuard } from "../auth/session.guard";
import { Public } from "../common/public.decorator";
import { VerificationService, VERIFICATION_IMAGE_MAX_BYTES } from "./verification.service";

type UploadedImageFile = {
  buffer: Buffer;
  mimetype: string;
};

@Controller()
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Get("verification/status")
  @UseGuards(SessionGuard)
  status(@Req() req: Request & { sessionUserId?: string }) {
    return this.verification.getStatus(req.sessionUserId!);
  }

  @Post("verification/capture-sessions")
  @UseGuards(SessionGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  createCaptureSession(@Req() req: Request & { sessionUserId?: string }) {
    return this.verification.createCaptureSession(req.sessionUserId!);
  }

  @Get("verification/capture-sessions/:id")
  @UseGuards(SessionGuard)
  getCaptureSession(
    @Req() req: Request & { sessionUserId?: string },
    @Param("id") id: string
  ) {
    return this.verification.getCaptureSession(req.sessionUserId!, id);
  }

  @Post("verification/submit")
  @UseGuards(SessionGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "selfie", maxCount: 1 },
        { name: "idFront", maxCount: 1 },
        { name: "idBack", maxCount: 1 },
      ],
      { limits: { fileSize: VERIFICATION_IMAGE_MAX_BYTES } }
    )
  )
  async submit(
    @Req() req: Request & { sessionUserId?: string },
    @Body()
    body: {
      legalName?: string;
      phone?: string;
      captureSessionId?: string;
    },
    @UploadedFiles()
    files?: {
      selfie?: UploadedImageFile[];
      idFront?: UploadedImageFile[];
      idBack?: UploadedImageFile[];
    }
  ) {
    const selfie = files?.selfie?.[0];
    const idFront = files?.idFront?.[0];
    const idBack = files?.idBack?.[0];

    if (!body.captureSessionId && (!selfie || !idFront || !idBack)) {
      throw new BadRequestException(
        "Provide captureSessionId or all three camera images."
      );
    }

    return this.verification.submit(req.sessionUserId!, {
      legalName: body.legalName ?? "",
      phone: body.phone ?? "",
      captureSessionId: body.captureSessionId?.trim() || undefined,
      selfie: selfie?.buffer,
      idFront: idFront?.buffer,
      idBack: idBack?.buffer,
      selfieType: selfie?.mimetype,
      idFrontType: idFront?.mimetype,
      idBackType: idBack?.mimetype,
    });
  }

  @Get("verification/review/:userId/:slot")
  @Public()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Header("Cache-Control", "private, no-store")
  async reviewImage(
    @Param("userId") userId: string,
    @Param("slot") slot: string,
    @Query("exp") exp: string,
    @Query("sig") sig: string
  ): Promise<StreamableFile> {
    const obj = await this.verification.streamReviewImage(
      userId,
      slot,
      exp,
      sig
    );
    if (!obj) throw new NotFoundException();
    return new StreamableFile(obj.body, {
      type: obj.contentType,
      disposition: "inline",
    });
  }

  @Get("public/verification/capture/:token")
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  publicCaptureStatus(@Param("token") token: string) {
    return this.verification.getPublicCaptureStatus(token);
  }

  @Post("public/verification/capture/:token/:slot")
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(
    FileFieldsInterceptor([{ name: "file", maxCount: 1 }], {
      limits: { fileSize: VERIFICATION_IMAGE_MAX_BYTES },
    })
  )
  async publicCaptureUpload(
    @Param("token") token: string,
    @Param("slot") slot: string,
    @UploadedFiles() files?: { file?: UploadedImageFile[] }
  ) {
    const file = files?.file?.[0];
    if (!file?.buffer) {
      throw new BadRequestException("Missing camera image.");
    }
    return this.verification.uploadPublicCaptureSlot(
      token,
      slot,
      file.buffer,
      file.mimetype
    );
  }
}
