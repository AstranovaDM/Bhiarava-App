import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentVisibility, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { AuthPrincipal } from '../auth/auth.types';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
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
    this.storage.validateUploadMeta(body.mimeType, body.sizeBytes);
    const key = this.storage.buildKey(actor.organizationId, 'documents', body.originalName);
    const doc = await this.prisma.document.create({
      data: {
        organizationId: actor.organizationId,
        projectId: body.projectId,
        bookingId: body.bookingId,
        customerId: body.customerId,
        visibility: body.visibility as DocumentVisibility,
        title: body.title,
        docType: body.docType || 'PENDING',
        storageKey: key,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes != null ? BigInt(body.sizeBytes) : undefined,
        uploadedById: actor.userId,
      },
    });
    const upload = await this.storage.getUploadUrl(key, body.mimeType || 'application/octet-stream', body.sizeBytes);

    if (body.customerId) {
      const cust = await this.prisma.customer.findUnique({ where: { id: body.customerId }, select: { userId: true } });
      if (cust?.userId) {
        await this.notifications.notify({
          organizationId: actor.organizationId,
          userId: cust.userId,
          title: 'Document pending',
          body: 'Document "' + body.title + '" is pending verification.',
          payloadJson: { kind: 'document_pending', documentId: doc.id, href: '/documents' },
          actorId: actor.userId,
        });
      }
    }
    await this.notifications.notify({
      organizationId: actor.organizationId,
      userId: actor.userId,
      title: 'Document pending',
      body: 'Uploaded "' + body.title + '" — pending verification.',
      payloadJson: { kind: 'document_pending', documentId: doc.id, href: '/documents' },
      actorId: actor.userId,
    });

    // Never return permanent raw bucket path — only signed upload URL + opaque key.
    return {
      document: {
        id: doc.id, title: doc.title, visibility: doc.visibility, mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes != null ? Number(doc.sizeBytes) : null, version: doc.version, createdAt: doc.createdAt,
      },
      upload,
    };
  }

  async download(actor: AuthPrincipal, id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, organizationId: actor.organizationId, archivedAt: null },
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (!this.visibilityFor(actor).includes(doc.visibility)) {
      throw new ForbiddenException('Not allowed');
    }
    if (actor.roleCode === 'CUSTOMER') {
      const owned = await this.prisma.customer.findFirst({
        where: { id: doc.customerId ?? '__none__', userId: actor.userId },
      });
      if (!owned) throw new ForbiddenException('Not allowed');
    }
    const dl = await this.storage.getDownloadUrl(doc.storageKey);
    return { document: { id: doc.id, title: doc.title, mimeType: doc.mimeType, version: doc.version }, download: dl };
  }

  /** Replace bytes → new storage key, bump version (old key retained until archive purge). */
  async replace(actor: AuthPrincipal, id: string, body: { originalName: string; mimeType?: string; sizeBytes?: number }) {
    if (actor.roleCode === 'CUSTOMER' || actor.roleCode === 'VIEWER') {
      throw new ForbiddenException('Not allowed');
    }
    const doc = await this.prisma.document.findFirst({
      where: { id, organizationId: actor.organizationId, archivedAt: null },
    });
    if (!doc) throw new NotFoundException('Document not found');
    this.storage.validateUploadMeta(body.mimeType, body.sizeBytes);
    const key = this.storage.buildKey(actor.organizationId, 'documents', body.originalName);
    const updated = await this.prisma.document.update({
      where: { id: doc.id },
      data: {
        storageKey: key,
        mimeType: body.mimeType ?? doc.mimeType,
        sizeBytes: body.sizeBytes != null ? BigInt(body.sizeBytes) : doc.sizeBytes,
        version: { increment: 1 },
        uploadedById: actor.userId,
      },
    });
    const upload = await this.storage.getUploadUrl(key, body.mimeType || doc.mimeType || 'application/octet-stream', body.sizeBytes);
    return {
      document: {
        id: updated.id, title: updated.title, version: updated.version,
        mimeType: updated.mimeType, sizeBytes: updated.sizeBytes != null ? Number(updated.sizeBytes) : null,
      },
      upload,
    };
  }

  async archive(actor: AuthPrincipal, id: string) {
    if (actor.roleCode === 'CUSTOMER' || actor.roleCode === 'VIEWER' || actor.roleCode === 'AGENT') {
      throw new ForbiddenException('Not allowed');
    }
    const doc = await this.prisma.document.findFirst({
      where: { id, organizationId: actor.organizationId, archivedAt: null },
    });
    if (!doc) throw new NotFoundException('Document not found');
    const updated = await this.prisma.document.update({
      where: { id: doc.id },
      data: { archivedAt: new Date() },
    });
    return { id: updated.id, archivedAt: updated.archivedAt };
  }

  async verify(actor: AuthPrincipal, id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, organizationId: actor.organizationId, archivedAt: null },
    });
    if (!doc) throw new NotFoundException('Document not found');
    const updated = await this.prisma.document.update({
      where: { id },
      data: { docType: 'VERIFIED' },
    });
    const targets = new Set<string>([actor.userId]);
    if (doc.customerId) {
      const cust = await this.prisma.customer.findUnique({ where: { id: doc.customerId }, select: { userId: true } });
      if (cust?.userId) targets.add(cust.userId);
    }
    for (const uid of targets) {
      await this.notifications.notify({
        organizationId: actor.organizationId,
        userId: uid,
        title: 'Document verified',
        body: 'Document "' + doc.title + '" was verified.',
        payloadJson: { kind: 'document_verified', documentId: id, href: '/documents' },
        actorId: actor.userId,
      });
    }
    return updated;
  }
}