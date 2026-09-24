/**
 * Channel provider interfaces — stubs only.
 * No third-party credentials required for local/dev.
 */
export type NotifyPayload = {
  toUserId?: string;
  toAddress?: string; // email / mobile / device token
  title: string;
  body: string;
  payloadJson?: Record<string, unknown>;
};

export interface EmailProvider {
  readonly channel: 'EMAIL';
  send(msg: NotifyPayload): Promise<{ ok: boolean; providerId?: string; stub?: boolean }>;
}

export interface SmsProvider {
  readonly channel: 'SMS';
  send(msg: NotifyPayload): Promise<{ ok: boolean; providerId?: string; stub?: boolean }>;
}

export interface WhatsAppProvider {
  readonly channel: 'WHATSAPP';
  send(msg: NotifyPayload): Promise<{ ok: boolean; providerId?: string; stub?: boolean }>;
}

export interface PushProvider {
  readonly channel: 'PUSH';
  send(msg: NotifyPayload): Promise<{ ok: boolean; providerId?: string; stub?: boolean }>;
}

export class StubEmailProvider implements EmailProvider {
  readonly channel = 'EMAIL' as const;
  async send(msg: NotifyPayload) {
    return { ok: true, stub: true, providerId: `email-stub:${msg.toAddress || msg.toUserId || 'unknown'}` };
  }
}

export class StubSmsProvider implements SmsProvider {
  readonly channel = 'SMS' as const;
  async send(msg: NotifyPayload) {
    return { ok: true, stub: true, providerId: `sms-stub:${msg.toAddress || msg.toUserId || 'unknown'}` };
  }
}

export class StubWhatsAppProvider implements WhatsAppProvider {
  readonly channel = 'WHATSAPP' as const;
  async send(msg: NotifyPayload) {
    return { ok: true, stub: true, providerId: `wa-stub:${msg.toAddress || msg.toUserId || 'unknown'}` };
  }
}

export class StubPushProvider implements PushProvider {
  readonly channel = 'PUSH' as const;
  async send(msg: NotifyPayload) {
    return { ok: true, stub: true, providerId: `push-stub:${msg.toAddress || msg.toUserId || 'unknown'}` };
  }
}
