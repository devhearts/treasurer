import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import { SessionGuard } from "../auth/session.guard";
import { Public } from "../common/public.decorator";
import { InvitationsService } from "./invitations.service";
import type { InviteCardContent, InviteTemplateId } from "./invitations.types";

type UploadedImageFile = {
  buffer: Buffer;
  mimetype: string;
};

@Controller()
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  private userId(req: Request & { sessionUserId?: string }): string {
    return req.sessionUserId!;
  }

  @Get("events/by-slug/:slug/invitations")
  @UseGuards(SessionGuard)
  listByEvent(
    @Req() req: Request & { sessionUserId?: string },
    @Param("slug") slug: string
  ) {
    return this.invitations.listByEventSlug(this.userId(req), slug);
  }

  @Post("events/by-slug/:slug/invitations")
  @UseGuards(SessionGuard)
  create(
    @Req() req: Request & { sessionUserId?: string },
    @Param("slug") slug: string
  ) {
    return this.invitations.createDraft(this.userId(req), slug);
  }

  @Get("invitations/:id")
  @UseGuards(SessionGuard)
  getOne(
    @Req() req: Request & { sessionUserId?: string },
    @Param("id") id: string
  ) {
    return this.invitations.getDetail(this.userId(req), id);
  }

  @Patch("invitations/:id")
  @UseGuards(SessionGuard)
  update(
    @Req() req: Request & { sessionUserId?: string },
    @Param("id") id: string,
    @Body()
    body: {
      title?: string;
      templateId?: InviteTemplateId;
      content?: Partial<InviteCardContent>;
    }
  ) {
    return this.invitations.update(this.userId(req), id, body);
  }

  @Post("invitations/:id/recipients")
  @UseGuards(SessionGuard)
  addRecipient(
    @Req() req: Request & { sessionUserId?: string },
    @Param("id") id: string,
    @Body() body: { guestName: string; contact?: string }
  ) {
    return this.invitations.addRecipient(this.userId(req), id, body);
  }

  @Delete("invitations/:id/recipients/:recipientId")
  @UseGuards(SessionGuard)
  removeRecipient(
    @Req() req: Request & { sessionUserId?: string },
    @Param("id") id: string,
    @Param("recipientId") recipientId: string
  ) {
    return this.invitations.removeRecipient(this.userId(req), id, recipientId);
  }

  @Post("invitations/:id/publish")
  @UseGuards(SessionGuard)
  publish(
    @Req() req: Request & { sessionUserId?: string },
    @Param("id") id: string
  ) {
    return this.invitations.publish(this.userId(req), id);
  }

  @Post("invitations/:id/duplicate")
  @UseGuards(SessionGuard)
  duplicate(
    @Req() req: Request & { sessionUserId?: string },
    @Param("id") id: string
  ) {
    return this.invitations.duplicate(this.userId(req), id);
  }

  @Delete("invitations/:id")
  @UseGuards(SessionGuard)
  delete(
    @Req() req: Request & { sessionUserId?: string },
    @Param("id") id: string
  ) {
    return this.invitations.delete(this.userId(req), id);
  }

  @Post("invitations/:id/photo")
  @UseGuards(SessionGuard)
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } })
  )
  uploadPhoto(
    @Req() req: Request & { sessionUserId?: string },
    @Param("id") id: string,
    @UploadedFile() file: UploadedImageFile | undefined
  ) {
    if (!file?.buffer) {
      throw new BadRequestException("Missing file.");
    }
    return this.invitations.saveInvitationPhoto(
      this.userId(req),
      id,
      file.buffer,
      file.mimetype
    );
  }

  @Post("invitations/:id/photo/use-event")
  @UseGuards(SessionGuard)
  useEventPhoto(
    @Req() req: Request & { sessionUserId?: string },
    @Param("id") id: string
  ) {
    return this.invitations.resetInvitationPhotoToEvent(this.userId(req), id);
  }

  @Delete("invitations/:id/photo")
  @UseGuards(SessionGuard)
  clearPhoto(
    @Req() req: Request & { sessionUserId?: string },
    @Param("id") id: string
  ) {
    return this.invitations.clearInvitationPhoto(this.userId(req), id);
  }

  @Get("invitations/:id/photo")
  @UseGuards(SessionGuard)
  @Header("Cache-Control", "private, max-age=60")
  async ownerPhoto(
    @Req() req: Request & { sessionUserId?: string },
    @Param("id") id: string
  ): Promise<StreamableFile> {
    const obj = await this.invitations.streamInvitationPhoto(
      this.userId(req),
      id
    );
    if (!obj) {
      throw new NotFoundException();
    }
    return new StreamableFile(obj.body, {
      type: obj.contentType,
      disposition: "inline",
    });
  }

  @Get("public/invites/:viewToken/photo")
  @Public()
  @Header("Cache-Control", "public, max-age=3600")
  async publicPhoto(
    @Param("viewToken") viewToken: string
  ): Promise<StreamableFile> {
    const obj = await this.invitations.streamPublicInvitePhoto(viewToken);
    if (!obj) {
      throw new NotFoundException();
    }
    return new StreamableFile(obj.body, {
      type: obj.contentType,
      disposition: "inline",
    });
  }

  @Get("public/invites/:viewToken")
  @Public()
  getPublic(@Param("viewToken") viewToken: string) {
    return this.invitations.getPublic(viewToken);
  }

  @Post("public/invites/:viewToken/rsvp")
  @Public()
  submitRsvp(
    @Param("viewToken") viewToken: string,
    @Body()
    body: {
      status: "accepted" | "declined" | "maybe";
      partySize?: number;
      message?: string;
    }
  ) {
    return this.invitations.submitRsvp(viewToken, body);
  }
}
