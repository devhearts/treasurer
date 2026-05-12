import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { EventsService, type CeremonyEventDto } from "./events.service";
import { SessionGuard } from "../auth/session.guard";

@Controller("events")
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get("mine")
  async mine(@Req() req: Request & { sessionUserId?: string }) {
    const uid = req.sessionUserId;
    if (!uid) return [];
    return this.events.listMine(uid);
  }

  @Get("by-slug/:slug")
  async bySlug(@Param("slug") slug: string) {
    const ev = await this.events.getBySlug(slug);
    if (!ev) return null;
    return ev;
  }

  @Post()
  @UseGuards(SessionGuard)
  async create(
    @Req() req: Request & { sessionUserId?: string },
    @Body()
    body: {
      event: CeremonyEventDto;
      subscriptionPaymentReferenceId?: string | null;
    }
  ) {
    if (!body?.event) {
      throw new BadRequestException("Missing event payload.");
    }
    const { slug } = await this.events.addEvent(
      req.sessionUserId!,
      body.event,
      body.subscriptionPaymentReferenceId
    );
    return { success: true, slug };
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
