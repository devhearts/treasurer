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
import {
  EventsService,
  EVENT_IMAGE_MAX_BYTES,
  type CreateEventInput,
} from "./events.service";
import { SessionGuard } from "../auth/session.guard";
import { Public } from "../common/public.decorator";
import { requestAuditContext } from "../audit/audit-context";

/** Multer in-memory file shape (avoid `Express.Multer.File` — not on Express 5 types). */
type UploadedImageFile = {
  buffer: Buffer;
  mimetype: string;
};

@Controller("events")
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get("mine")
  async mine(@Req() req: Request & { sessionUserId?: string }) {
    const uid = req.sessionUserId;
    if (!uid) return [];
    return this.events.listMine(uid);
  }

  @Get("by-slug/:slug/for-edit")
  @UseGuards(SessionGuard)
  async forEdit(
    @Req() req: Request & { sessionUserId?: string },
    @Param("slug") slug: string
  ) {
    const out = await this.events.getForEdit(req.sessionUserId!, slug);
    if (!out) throw new NotFoundException();
    return out;
  }

  @Patch("by-slug/:slug")
  @UseGuards(SessionGuard)
  async updateBySlug(
    @Req() req: Request & { sessionUserId?: string },
    @Param("slug") slug: string,
    @Body()
    body: {
      title: string;
      type: string;
      organizer: string;
      treasurerPhone: string;
      description: string;
      date: string;
      location: string;
      targetAmount: number;
      imageUrls?: string[] | null;
    }
  ) {
    await this.events.updateEventForOwner(
      req.sessionUserId!,
      slug,
      body,
      requestAuditContext(req)
    );
    return { success: true };
  }

  @Get("by-slug/:slug/gallery/:slot")
  @Public()
  @Header("Cache-Control", "public, max-age=86400")
  async galleryImage(
    @Param("slug") slug: string,
    @Param("slot") slot: string
  ): Promise<StreamableFile> {
    const s = Number.parseInt(slot, 10);
    if (!Number.isInteger(s) || s < 0 || s > 2) {
      throw new BadRequestException("Invalid slot.");
    }
    const obj = await this.events.streamGalleryObject(slug, s);
    if (!obj) {
      throw new NotFoundException();
    }
    return new StreamableFile(obj.body, {
      type: obj.contentType,
      disposition: "inline",
    });
  }

  @Get("by-slug/:slug/og")
  @Public()
  @Header("Cache-Control", "public, max-age=86400")
  async ogImage(@Param("slug") slug: string): Promise<StreamableFile> {
    const obj = await this.events.streamEventOgObject(slug);
    if (!obj) {
      throw new NotFoundException();
    }
    return new StreamableFile(obj.body, {
      type: obj.contentType,
      disposition: "inline",
    });
  }

  @Get("by-slug/:slug")
  async bySlug(@Param("slug") slug: string) {
    const ev = await this.events.getBySlug(slug);
    if (!ev) return null;
    return ev;
  }

  @Post("image")
  @UseGuards(SessionGuard)
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: EVENT_IMAGE_MAX_BYTES } })
  )
  async uploadEventImage(
    @Req() req: Request & { sessionUserId?: string },
    @UploadedFile() file: UploadedImageFile | undefined,
    @Body("eventId") eventId: string | undefined,
    @Body("slug") slug: string | undefined,
    @Body("slot") slotRaw: string
  ): Promise<{ key: string }> {
    if (!file?.buffer) {
      throw new BadRequestException("Missing file.");
    }
    const slot = Number.parseInt(slotRaw, 10);
    if (!Number.isInteger(slot) || slot < 0 || slot > 2) {
      throw new BadRequestException("Invalid slot.");
    }
    const resolvedId = await this.events.resolveEventIdForImageUpload(
      req.sessionUserId!,
      eventId,
      slug
    );
    return this.events.saveDraftEventImage(
      req.sessionUserId!,
      resolvedId,
      slot,
      file.buffer,
      file.mimetype,
      requestAuditContext(req)
    );
  }

  @Delete("image")
  @UseGuards(SessionGuard)
  async deleteEventImage(
    @Req() req: Request & { sessionUserId?: string },
    @Body() body: { key?: string }
  ): Promise<{ success: true }> {
    const key = body?.key?.trim();
    if (!key) {
      throw new BadRequestException("Missing key.");
    }
    await this.events.deleteDraftEventImage(
      req.sessionUserId!,
      key,
      requestAuditContext(req)
    );
    return { success: true };
  }

  @Post()
  @UseGuards(SessionGuard)
  async create(
    @Req() req: Request & { sessionUserId?: string },
    @Body()
    body: {
      event: CreateEventInput;
      subscriptionPaymentReferenceId?: string | null;
    }
  ) {
    if (!body?.event) {
      throw new BadRequestException("Missing event payload.");
    }
    const { slug } = await this.events.addEvent(
      req.sessionUserId!,
      body.event,
      body.subscriptionPaymentReferenceId,
      requestAuditContext(req)
    );
    return { success: true, slug };
  }

  @Post("by-slug/:slug/pause")
  @UseGuards(SessionGuard)
  async pauseEvent(
    @Req() req: Request & { sessionUserId?: string },
    @Param("slug") slug: string
  ) {
    await this.events.pauseEventForOwner(
      req.sessionUserId!,
      slug,
      requestAuditContext(req)
    );
    return { success: true };
  }

  @Post("by-slug/:slug/resume")
  @UseGuards(SessionGuard)
  async resumeEvent(
    @Req() req: Request & { sessionUserId?: string },
    @Param("slug") slug: string
  ) {
    await this.events.resumeEventForOwner(
      req.sessionUserId!,
      slug,
      requestAuditContext(req)
    );
    return { success: true };
  }

  @Post("by-slug/:slug/stop")
  @UseGuards(SessionGuard)
  async stopEvent(
    @Req() req: Request & { sessionUserId?: string },
    @Param("slug") slug: string,
    @Body() body: { message: string }
  ) {
    await this.events.stopEventForOwner(
      req.sessionUserId!,
      slug,
      body?.message ?? "",
      requestAuditContext(req)
    );
    return { success: true };
  }

  @Post("by-slug/:slug/contributions")
  async addContribution(
    @Param("slug") slug: string,
    @Body()
    body: {
      name: string;
      anonymous: boolean;
      amount: number;
      phone: string;
      message?: string;
      status: "paid" | "pledged";
      date: string;
      pledgeHopeBy?: string;
      manual?: boolean;
      milestoneId?: string;
    }
  ) {
    await this.events.addContribution(slug, body);
    return { success: true };
  }

  @Post("by-slug/:slug/milestones")
  @UseGuards(SessionGuard)
  async addMilestone(
    @Req() req: Request & { sessionUserId?: string },
    @Param("slug") slug: string,
    @Body() body: { name: string; targetAmount: number }
  ) {
    const { id } = await this.events.addMilestoneItem(
      req.sessionUserId!,
      slug,
      body
    );
    return { success: true, id };
  }

  @Delete("by-slug/:slug/milestones/:milestoneId")
  @UseGuards(SessionGuard)
  async deleteMilestone(
    @Req() req: Request & { sessionUserId?: string },
    @Param("slug") slug: string,
    @Param("milestoneId") milestoneId: string
  ) {
    await this.events.deleteMilestoneItem(
      req.sessionUserId!,
      slug,
      milestoneId
    );
    return { success: true };
  }

  @Post("by-slug/:slug/contributions/:cid/visibility")
  @UseGuards(SessionGuard)
  async visibility(
    @Req() req: Request & { sessionUserId?: string },
    @Param("slug") slug: string,
    @Param("cid") cid: string,
    @Body() body: { visible: boolean }
  ) {
    await this.events.setContributionVisibility(
      req.sessionUserId!,
      slug,
      cid,
      body.visible
    );
    return { success: true };
  }
}
