import {
  StubEmailProvider,
  StubSmsProvider,
  StubWhatsAppProvider,
  StubPushProvider,
} from './providers/notification-provider';

describe('notification provider stubs', () => {
  it('email stub returns ok without credentials', async () => {
    const r = await new StubEmailProvider().send({ title: 't', body: 'b', toAddress: 'a@b.co' });
    expect(r.ok).toBe(true);
    expect(r.stub).toBe(true);
  });

  it('sms / whatsapp / push stubs return ok', async () => {
    expect((await new StubSmsProvider().send({ title: 't', body: 'b' })).stub).toBe(true);
    expect((await new StubWhatsAppProvider().send({ title: 't', body: 'b' })).stub).toBe(true);
    expect((await new StubPushProvider().send({ title: 't', body: 'b' })).stub).toBe(true);
  });
});
