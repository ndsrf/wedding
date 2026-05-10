import { prisma } from '@/lib/db/prisma';

// ============================================================================
// DEFAULT TEMPLATE DATA
// ============================================================================

interface DefaultStage {
  name: string;
  duration_minutes: number;
  visible_to_couple: boolean;
  notes?: string;
}

interface DefaultBlock {
  name: string;
  color: string;
  // offset_minutes from start_time; null = sequential (starts after previous block)
  offset_minutes?: number | null;
  stages: DefaultStage[];
}

// Planner template — calibrated for a ceremony at 12:30 with start_time 08:00.
// Preparativos (8:00) and Montaje (8:00) run in parallel so they don't
// delay the ceremony. Ceremonia is anchored 4h30min from start_time.
const PLANNER_DEFAULT_TEMPLATE: DefaultBlock[] = [
  {
    name: 'Preparativos',
    color: '#ec4899',
    offset_minutes: null, // sequential — starts at start_time (08:00)
    stages: [
      { name: 'Llegada de la peluquera', duration_minutes: 90, visible_to_couple: false },
      { name: 'Peinado novia', duration_minutes: 60, visible_to_couple: true },
      { name: 'Maquillaje novia', duration_minutes: 60, visible_to_couple: true },
      { name: 'Maquillaje y peinado damas de honor', duration_minutes: 60, visible_to_couple: false },
      { name: 'Colocación del vestido', duration_minutes: 30, visible_to_couple: true },
      { name: 'Fotos de preparativos', duration_minutes: 45, visible_to_couple: true },
    ],
  },
  {
    name: 'Montaje',
    color: '#8b5cf6',
    offset_minutes: 0, // parallel with Preparativos — also starts at start_time (08:00)
    stages: [
      { name: 'Entrega flores y decoración', duration_minutes: 120, visible_to_couple: false },
      { name: 'Instalación equipo DJ / música', duration_minutes: 90, visible_to_couple: false },
      { name: 'Prueba de sonido', duration_minutes: 30, visible_to_couple: false },
      { name: 'Revisión y ajuste final del espacio', duration_minutes: 30, visible_to_couple: false },
    ],
  },
  {
    name: 'Ceremonia',
    color: '#f59e0b',
    offset_minutes: 270, // 4h 30min after start_time → 12:30 when start is 08:00
    stages: [
      { name: 'Llegada de invitados', duration_minutes: 30, visible_to_couple: true },
      { name: 'Entrada del novio', duration_minutes: 5, visible_to_couple: true },
      { name: 'Rito / Celebración', duration_minutes: 45, visible_to_couple: true },
      { name: 'Salida y fotos de grupo', duration_minutes: 30, visible_to_couple: true },
    ],
  },
  {
    name: 'Banquete',
    color: '#10b981',
    offset_minutes: null, // sequential — starts after Ceremonia ends
    stages: [
      { name: 'Cóctel de bienvenida', duration_minutes: 90, visible_to_couple: true },
      { name: 'Entrada al salón / sentados', duration_minutes: 15, visible_to_couple: true },
      { name: 'Comida / Banquete sentados', duration_minutes: 120, visible_to_couple: true },
      { name: 'Brindis y discursos', duration_minutes: 20, visible_to_couple: true },
      { name: 'Tarta nupcial', duration_minutes: 20, visible_to_couple: true },
      { name: 'Primer baile', duration_minutes: 15, visible_to_couple: true },
      { name: 'Baile abierto', duration_minutes: 60, visible_to_couple: true },
    ],
  },
];

// ============================================================================
// ENSURE DEFAULT TEMPLATE EXISTS FOR A PLANNER
// ============================================================================

export async function ensureScheduleTemplate(planner_id: string) {
  const existing = await prisma.scheduleTemplate.findUnique({ where: { planner_id } });
  if (existing) return existing;

  return prisma.scheduleTemplate.create({
    data: {
      planner_id,
      blocks: {
        create: PLANNER_DEFAULT_TEMPLATE.map((block, blockIdx) => ({
          name: block.name,
          order: blockIdx,
          color: block.color,
          offset_minutes: block.offset_minutes ?? null,
          stages: {
            create: block.stages.map((stage, stageIdx) => ({
              name: stage.name,
              duration_minutes: stage.duration_minutes,
              order: stageIdx,
              visible_to_couple: stage.visible_to_couple,
              notes: stage.notes ?? null,
            })),
          },
        })),
      },
    },
  });
}

// ============================================================================
// APPLY TEMPLATE TO WEDDING (copy blocks/stages, set start_time)
// ============================================================================

export async function applyScheduleToWedding(
  planner_id: string,
  wedding_id: string,
  start_time: string = '08:00'
) {
  // Get (or create) the planner's template
  await ensureScheduleTemplate(planner_id);

  const template = await prisma.scheduleTemplate.findUnique({
    where: { planner_id },
    include: {
      blocks: {
        orderBy: { order: 'asc' },
        include: { stages: { orderBy: { order: 'asc' } } },
      },
    },
  });

  if (!template) return;

  // Delete existing wedding schedule blocks (idempotent re-apply)
  await prisma.scheduleBlock.deleteMany({ where: { wedding_id, template_id: null } });
  await prisma.weddingSchedule.deleteMany({ where: { wedding_id } });

  // Copy blocks + stages
  for (const block of template.blocks) {
    await prisma.scheduleBlock.create({
      data: {
        wedding_id,
        name: block.name,
        order: block.order,
        color: block.color,
        offset_minutes: (block as { offset_minutes?: number | null }).offset_minutes ?? null,
        stages: {
          create: block.stages.map((s: { name: string; duration_minutes: number; order: number; notes: string | null; visible_to_couple: boolean }) => ({
            name: s.name,
            duration_minutes: s.duration_minutes,
            order: s.order,
            notes: s.notes,
            visible_to_couple: s.visible_to_couple,
          })),
        },
      },
    });
  }

  // Create wedding schedule config
  await prisma.weddingSchedule.create({ data: { wedding_id, start_time } });
}
