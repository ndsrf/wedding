import { prisma } from '@/lib/db/prisma';
import type {
  ScheduleTemplate,
  ScheduleBlock,
  WeddingScheduleWithBlocks,
  CreateBlockData,
  UpdateBlockData,
  CreateStageData,
  UpdateStageData,
  UpsertWeddingScheduleData,
} from '@/types/schedule';

// ============================================================================
// TEMPLATE RETRIEVAL
// ============================================================================

export async function getScheduleTemplate(planner_id: string): Promise<ScheduleTemplate | null> {
  const template = await prisma.scheduleTemplate.findUnique({
    where: { planner_id },
    include: {
      blocks: {
        orderBy: { order: 'asc' },
        include: {
          stages: { orderBy: { order: 'asc' } },
        },
      },
    },
  });
  return template as ScheduleTemplate | null;
}

// ============================================================================
// WEDDING SCHEDULE RETRIEVAL
// ============================================================================

export async function getWeddingSchedule(wedding_id: string): Promise<WeddingScheduleWithBlocks> {
  const [schedule, blocks] = await Promise.all([
    prisma.weddingSchedule.findUnique({ where: { wedding_id } }),
    prisma.scheduleBlock.findMany({
      where: { wedding_id, template_id: null },
      orderBy: { order: 'asc' },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: {
            wedding_provider: {
              select: { id: true, name: true, category: { select: { name: true } } },
            },
          },
        },
      },
    }),
  ]);
  return {
    schedule,
    blocks: blocks as ScheduleBlock[],
  };
}

// ============================================================================
// BLOCK CRUD (works for both template and wedding)
// ============================================================================

export async function createBlock(
  data: CreateBlockData & ({ template_id: string } | { wedding_id: string })
) {
  return prisma.scheduleBlock.create({ data: { ...data, stages: undefined } });
}

export async function updateBlock(data: UpdateBlockData) {
  const { block_id, ...rest } = data;
  return prisma.scheduleBlock.update({ where: { id: block_id }, data: rest });
}

export async function deleteBlock(block_id: string) {
  return prisma.scheduleBlock.delete({ where: { id: block_id } });
}

// ============================================================================
// STAGE CRUD
// ============================================================================

export async function createStage(data: CreateStageData) {
  const { block_id, wedding_provider_id, ...rest } = data;
  return prisma.scheduleStage.create({
    data: {
      ...rest,
      block: { connect: { id: block_id } },
      ...(wedding_provider_id
        ? { wedding_provider: { connect: { id: wedding_provider_id } } }
        : {}),
    },
  });
}

export async function updateStage(data: UpdateStageData) {
  const { stage_id, block_id, wedding_provider_id, ...rest } = data;
  return prisma.scheduleStage.update({
    where: { id: stage_id },
    data: {
      ...rest,
      ...(block_id !== undefined ? { block: { connect: { id: block_id } } } : {}),
      ...(wedding_provider_id === null
        ? { wedding_provider: { disconnect: true } }
        : wedding_provider_id !== undefined
          ? { wedding_provider: { connect: { id: wedding_provider_id } } }
          : {}),
    },
  });
}

export async function deleteStage(stage_id: string) {
  return prisma.scheduleStage.delete({ where: { id: stage_id } });
}

// ============================================================================
// WEDDING SCHEDULE UPSERT
// ============================================================================

export async function upsertWeddingSchedule(
  wedding_id: string,
  data: UpsertWeddingScheduleData
) {
  return prisma.weddingSchedule.upsert({
    where: { wedding_id },
    create: { wedding_id, ...data },
    update: data,
  });
}

// ============================================================================
// BATCH REORDER (stages or blocks)
// ============================================================================

export async function reorderBlocks(updates: Array<{ id: string; order: number }>) {
  await prisma.$transaction(
    updates.map((u) => prisma.scheduleBlock.update({ where: { id: u.id }, data: { order: u.order } }))
  );
}

export async function reorderStages(updates: Array<{ id: string; order: number }>) {
  await prisma.$transaction(
    updates.map((u) => prisma.scheduleStage.update({ where: { id: u.id }, data: { order: u.order } }))
  );
}
