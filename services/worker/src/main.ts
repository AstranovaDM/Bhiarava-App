import { Worker, Queue } from 'bullmq';
import { PrismaClient } from '@bhairava/database';
import { PlotStatus, ReservationState, StatusChangeSource } from '@prisma/client';

const connection = { url: process.env.REDIS_URL || 'redis://localhost:6379' };
const prisma = new PrismaClient();

export const RESERVATION_EXPIRY_QUEUE = 'reservation-expiry';

async function releaseExpiredBatch(limit = 100) {
  const now = new Date();
  const due = await prisma.reservation.findMany({
    where: { state: ReservationState.ACTIVE, expiresAt: { lte: now } },
    take: limit,
    orderBy: { expiresAt: 'asc' },
  });
  let released = 0;
  for (const r of due) {
    try {
      await prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<Array<{ id: string; status: PlotStatus }>>`
          SELECT id, status FROM plots WHERE id = ${r.plotId} FOR UPDATE
        `;
        const plot = rows[0];
        const fresh = await tx.reservation.findUnique({ where: { id: r.id } });
        if (!fresh || fresh.state !== ReservationState.ACTIVE) return;
        if (fresh.expiresAt.getTime() > Date.now()) return;

        await tx.reservation.update({
          where: { id: r.id },
          data: { state: ReservationState.EXPIRED },
        });
        if (plot && plot.status === PlotStatus.RESERVED) {
          await tx.plot.update({
            where: { id: plot.id },
            data: { status: PlotStatus.AVAILABLE },
          });
          await tx.plotStatusHistory.create({
            data: {
              plotId: plot.id,
              fromStatus: PlotStatus.RESERVED,
              toStatus: PlotStatus.AVAILABLE,
              reason: 'Reservation expired (worker)',
              source: StatusChangeSource.SYSTEM,
              actorId: null,
            },
          });
        }
        released += 1;
      });
    } catch {
      // race with booking conversion — skip
    }
  }
  return released;
}

async function main() {
  const queue = new Queue(RESERVATION_EXPIRY_QUEUE, { connection });
  await queue.add(
    'sweep',
    {},
    { repeat: { every: 60_000 }, removeOnComplete: 100, removeOnFail: 100 },
  );

  // eslint-disable-next-line no-new
  new Worker(
    RESERVATION_EXPIRY_QUEUE,
    async () => {
      const n = await releaseExpiredBatch();
      if (n > 0) console.log(`[worker] released ${n} expired reservation(s)`);
      return { released: n };
    },
    { connection },
  );

  console.log('[worker] reservation expiry worker started (every 60s)');
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
