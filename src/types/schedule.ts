// Minimal provider shape needed for stage display
export interface StageProvider {
  id: string;
  name: string | null;
  category: { name: string };
}

export interface ScheduleStage {
  id: string;
  block_id: string;
  name: string;
  duration_minutes: number;
  order: number;
  notes: string | null;
  visible_to_couple: boolean;
  wedding_provider_id: string | null;
  wedding_provider: StageProvider | null;
  created_at: Date;
  updated_at: Date;
}

export interface ScheduleBlock {
  id: string;
  template_id: string | null;
  wedding_id: string | null;
  name: string;
  order: number;
  color: string | null;
  offset_minutes: number | null;
  created_at: Date;
  updated_at: Date;
  stages: ScheduleStage[];
}

export interface ScheduleTemplate {
  id: string;
  planner_id: string;
  created_at: Date;
  updated_at: Date;
  blocks: ScheduleBlock[];
}

export interface WeddingSchedule {
  id: string;
  wedding_id: string;
  start_time: string; // "HH:MM"
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface WeddingScheduleWithBlocks {
  schedule: WeddingSchedule | null;
  blocks: ScheduleBlock[];
}

// A stage with its calculated start time for display
export interface ScheduleStageWithTime extends ScheduleStage {
  calculated_start_time: string; // "HH:MM"
  calculated_end_time: string;   // "HH:MM"
}

export interface ScheduleBlockWithTimes extends Omit<ScheduleBlock, 'stages'> {
  stages: ScheduleStageWithTime[];
  block_start_time: string;
  block_end_time: string;
}

// ── API payload types ────────────────────────────────────────────────────────

export interface CreateBlockData {
  name: string;
  order: number;
  color?: string;
}

export interface UpdateBlockData {
  block_id: string;
  name?: string;
  order?: number;
  color?: string;
  offset_minutes?: number | null;
}

export interface CreateStageData {
  block_id: string;
  name: string;
  duration_minutes: number;
  order: number;
  notes?: string | null;
  visible_to_couple?: boolean;
  wedding_provider_id?: string | null;
}

export interface UpdateStageData {
  stage_id: string;
  block_id?: string;
  name?: string;
  duration_minutes?: number;
  order?: number;
  notes?: string | null;
  visible_to_couple?: boolean;
  wedding_provider_id?: string | null;
}

export interface UpsertWeddingScheduleData {
  start_time: string;
  notes?: string | null;
}

// ── Utility ──────────────────────────────────────────────────────────────────

/** Add minutes to a "HH:MM" string, returning the new "HH:MM" string. */
export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

/** Calculate all stage start/end times from a base start_time string "HH:MM".
 *  Blocks with offset_minutes set start at (start_time + offset) and run in parallel;
 *  they do not advance the sequential cursor used by following blocks.
 */
export function computeScheduleWithTimes(
  blocks: ScheduleBlock[],
  start_time: string
): ScheduleBlockWithTimes[] {
  let cursor = start_time; // tracks the latest end time seen so far
  return blocks
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((block) => {
      const hasOffset = block.offset_minutes !== null && block.offset_minutes !== undefined;
      const block_start_time = hasOffset
        ? addMinutesToTime(start_time, block.offset_minutes!)
        : cursor;

      let stageCursor = block_start_time;
      const sortedStages = block.stages.slice().sort((a, b) => a.order - b.order);
      const stagesWithTimes: ScheduleStageWithTime[] = sortedStages.map((stage) => {
        const calculated_start_time = stageCursor;
        stageCursor = addMinutesToTime(stageCursor, stage.duration_minutes);
        return { ...stage, calculated_start_time, calculated_end_time: stageCursor };
      });

      const block_end_time = stageCursor;
      // Advance cursor to the latest end time (max), regardless of sequential/parallel.
      // This ensures the next sequential block starts after everything that ran before it.
      if (block_end_time > cursor) cursor = block_end_time;

      return { ...block, stages: stagesWithTimes, block_start_time, block_end_time };
    });
}
