import {
  BHAIRAVA_DIRECT_CODE,
  decideMobileOnlyDup,
  decidePhoneStealAttempt,
  generateAgentCode,
  invitePublicMeta,
  needsProfileCompletion,
  normalizePhoneIn,
  resolveDirectAppSalesOwner,
  resolveInviteSalesOwner,
  resolveSiteVisitAssignee,
} from '@bhairava/domain';

describe('phone normalize', () => {
  it('normalizes +91 / spaces / dashes to 10 digits', () => {
    expect(normalizePhoneIn('+91 98765-43210')).toBe('9876543210');
    expect(normalizePhoneIn('09876543210')).toBe('9876543210');
  });
  it('rejects invalid mobiles', () => {
    expect(normalizePhoneIn('12345')).toBeNull();
    expect(normalizePhoneIn('5876543210')).toBeNull();
  });
});

describe('customer signup / mobile-only dup privacy', () => {
  it('allows first use of a mobile', () => {
    expect(
      decideMobileOnlyDup({
        normalizedMobile: '9876543210',
        existingOwner: null,
        claimant: { userId: 'u1', googleSub: 'g1', email: 'a@x.com' },
      }),
    ).toEqual({ ok: true });
  });

  it('blocks mobile-only dup without leaking PII', () => {
    const decision = decideMobileOnlyDup({
      normalizedMobile: '9876543210',
      existingOwner: { userId: 'u-other', googleSub: 'g-other', email: 'other@x.com' },
      claimant: { userId: 'u1', googleSub: 'g1', email: 'a@x.com' },
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe('MOBILE_CONFLICT');
      expect(decision.message).not.toMatch(/other@x\.com|g-other|u-other|9876543210/);
      expect(decision.message).toMatch(/cannot be used/i);
    }
  });

  it('allows same Google identity / email to continue', () => {
    expect(
      decideMobileOnlyDup({
        normalizedMobile: '9876543210',
        existingOwner: { userId: 'u1', googleSub: 'g1', email: 'a@x.com' },
        claimant: { userId: 'u1', googleSub: 'g1', email: 'a@x.com' },
      }).ok,
    ).toBe(true);
  });

  it('returning users skip profile when completed', () => {
    expect(needsProfileCompletion(new Date())).toBe(false);
    expect(needsProfileCompletion(null)).toBe(true);
  });
});

describe('invite + attribution (separate from sales owner field shape)', () => {
  it('DIRECT_APP assigns Bhairava Direct sales owner', () => {
    const r = resolveDirectAppSalesOwner('agent-direct');
    expect(r.attributionSource).toBe('DIRECT_APP');
    expect(r.agentId).toBe('agent-direct');
    expect(BHAIRAVA_DIRECT_CODE).toBe('BHAIRAVA_DIRECT');
  });

  it('AGENT_INVITE attributes inviting agent as sales owner', () => {
    const r = resolveInviteSalesOwner('agent-42');
    expect(r).toEqual({
      agentId: 'agent-42',
      invitedByAgentId: 'agent-42',
      attributionSource: 'AGENT_INVITE',
    });
  });

  it('invite public meta never exposes customer PII fields', () => {
    const meta = invitePublicMeta({
      agentName: 'Priya',
      agentCode: 'AG-01',
      orgName: 'Bhairava',
      expiresAt: new Date(Date.now() + 86400000),
      claimedAt: null,
      revokedAt: null,
    });
    expect(meta.valid).toBe(true);
    expect(Object.keys(meta).sort()).toEqual(
      ['agentCode', 'agentName', 'expiresAt', 'orgName', 'valid'].sort(),
    );
  });
});

describe('no steal by phone + assignment audit signal', () => {
  it('blocks phone steal across agents', () => {
    const d = decidePhoneStealAttempt({
      normalizedMobile: '9876543210',
      existingCustomer: { id: 'c1', agentId: 'agent-a' },
      actingAgentId: 'agent-b',
    });
    expect(d.ok).toBe(false);
    if (!d.ok) {
      expect(d.audit).toBe(true);
      expect(d.message).not.toMatch(/agent-a|c1|Priya|email/i);
    }
  });

  it('allows create when phone is free', () => {
    expect(
      decidePhoneStealAttempt({
        normalizedMobile: '9876543210',
        existingCustomer: null,
        actingAgentId: 'agent-b',
      }),
    ).toEqual({ ok: true, action: 'create' });
  });
});

describe('site-visit routing', () => {
  it('assigns primary agent when Active', () => {
    expect(
      resolveSiteVisitAssignee({
        primaryAgent: { id: 'a1', status: 'Active', code: 'AG-01' },
        bhairavaDirectAgentId: 'direct',
      }),
    ).toEqual({ agentId: 'a1', reason: 'PRIMARY_AGENT' });
  });

  it('falls back to Bhairava Direct when primary missing/inactive', () => {
    expect(
      resolveSiteVisitAssignee({
        primaryAgent: { id: 'a1', status: 'Suspended', code: 'AG-01' },
        bhairavaDirectAgentId: 'direct',
      }),
    ).toEqual({ agentId: 'direct', reason: 'BHAIRAVA_DIRECT' });
    expect(
      resolveSiteVisitAssignee({
        primaryAgent: null,
        bhairavaDirectAgentId: 'direct',
      }),
    ).toEqual({ agentId: 'direct', reason: 'BHAIRAVA_DIRECT' });
  });
});

describe('agent open signup code', () => {
  it('generates unique agent codes without admin approval gate', () => {
    const codes = new Set(['AG-AAAA']);
    const next = generateAgentCode(codes, 'aaaa');
    expect(next).not.toBe('AG-AAAA');
    expect(next.startsWith('AG-')).toBe(true);
  });
});
