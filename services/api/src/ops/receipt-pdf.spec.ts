import { amountInWordsInr, formatInrFromPaise, buildReceiptPdf } from './receipt-pdf';

describe('receipt-pdf', () => {
  it('formats INR from paise with Indian grouping', () => {
    expect(formatInrFromPaise('100')).toBe('INR 1.00');
    expect(formatInrFromPaise('123456789')).toBe('INR 12,34,567.89');
  });

  it('amount in words for common values', () => {
    expect(amountInWordsInr('100')).toMatch(/Rupees One Only/);
    expect(amountInWordsInr('150050')).toMatch(/Rupees One Thousand Five Hundred/);
    expect(amountInWordsInr('150050')).toMatch(/Fifty Paise/);
  });

  it('builds a non-empty PDF buffer deterministically for same inputs', async () => {
    const input = {
      receiptNumber: 'RCP-000001',
      customerName: 'Test Customer',
      projectName: 'Demo Project',
      projectCode: 'DEMO',
      plotNumber: 'A-101',
      bookingId: 'bk_test',
      amountPaise: '25000000',
      paymentMethod: 'UPI',
      txnRef: 'TXN123',
      paidAt: new Date('2026-01-15T10:00:00.000Z'),
      generatedAt: new Date('2026-01-15T11:00:00.000Z'),
      authorizedBy: 'admin@example.com',
    };
    const a = await buildReceiptPdf(input);
    const b = await buildReceiptPdf(input);
    expect(a.length).toBeGreaterThan(500);
    expect(a.subarray(0, 4).toString()).toBe('%PDF');
    expect(Buffer.compare(a, b)).toBe(0);
  });
});
