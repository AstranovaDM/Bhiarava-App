import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentVisibility, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { AuthPrincipal } from '../auth/auth.types';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private visibilityFor(actor: AuthPrincipal): DocumentVisibility[] {
    if (actor.roleCode === 'CUSTOMER') return [DocumentVisibility.CUSTOMER_PROFILE_RELATED];
    if (actor.roleCode === 'AGENT') {
      return [DocumentVisibility.AGENT_VISIBLE, DocumentVisibility.CUSTOMER_PROFILE_RELATED];
    }
    return [
      DocumentVisibility.INTERNAL,
      DocumentVisibility.AGENT_VISIBLE,
      DocumentVisibility.CUSTOMER_PROFILE_RELATED,
    ];
  }

  async list(actor: AuthPrincipal, q: { projectId?: string; bookingId?: string; customerId?: string } = {}) {
    const where: Prisma.DocumentWhereInput = {
      organizationId: actor.organizationId,
      archivedAt: null,
      visibility: { in: this.visibilityFor(actor) },
    };
    if (q.projectId) where.projectId = q.projectId;
    if (q.bookingId) where.bookingId = q.bookingId;
    if (q.customerId) where.customerId = q.customerId;
    if (actor.roleCode === 'CUSTOMER') {
      where.customer = { userId: actor.userId };
    }
    return this.prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, projectId: true, bookingId: true, customerId: true,
        visibility: true, title: true, docType: true, mimeType: true,
        sizeBytes: true, version: true, createdAt: true,
      },
    });
  }

  async create(actor: AuthPrincipal, body: {
    title: string; visibility: string; originalName: string; mimeType?: string; sizeBytes?: number;
    projectId?: string; bookingId?: string; customerId?: string; docType?: string;
  }) {
    if (actor.roleCode === 'CUSTOMER') throw new ForbiddenException('Customers cannot upload');
    const key = this.storage.buildKey(actor.organizationId, 'documents', body.originalName);
    const doc = await this.prisma.document.create({
      data: {
        organizationId: actor.organizationId,
        projectId: body.projectId,
        bookingId: body.bookingId,
        customerId: body.customerId,
        visibility: body.visibility as DocumentVisibility,
        title: body.title,
        docType: body.docType,
        storageKey: key,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes != null ? BigInt(body.sizeBytes) : undefined,
        uploadedById: actor.userId,
      },
    });
    const upload = await this.storage.getUploadUrl(key, body.mimeType || 'application/octet-stream');
    return { document: doc, upload };
  }

  async download(actor: AuthPrincipal, id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, organizationId: actor.organizationId, archivedAt: null },
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (!this.visibilityFor(actor).includes(doc.visibility)) {
      throw new ForbiddenException('Not allowed');
    }
    const dl = await this.storage.getDownloadUrl(doc.storageKey);
    return { document: { id: doc.id, title: doc.title, mimeType: doc.mimeType }, download: dl };
  }
}

