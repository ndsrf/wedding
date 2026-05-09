export interface ScheduleStage {
  id: string;
  block_id: string;
  name: string;
  duration_minutes: number;
  order: number;
  notes: string | null;
  visible_to_couple: boolean;
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
}

export interface CreateStageData {
  block_id: string;
  name: string;
  duration_minutes: number;
  order: number;
  notes?: string | null;
  visible_to_couple?: boolean;
}

export interface UpdateStageData {
  stage_id: string;
  name?: string;
  duration_minutes?: number;
  order?: number;
  notes?: string | null;
  visible_to_couple?: boolean;
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

/** Calculate all stage start/end times from a base start_time string "HH:MM". */
export function computeScheduleWithTimes(
  blocks: ScheduleBlock[],
  start_time: string
): ScheduleBlockWithTimes[] {
  let cursor = start_time;
  return blocks
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((block) => {
      const block_start_time = cursor;
      const sortedStages = block.stages.slice().sort((a, b) => a.order - b.order);
      const stagesWithTimes: ScheduleStageWithTime[] = sortedStages.map((stage) => {
        const calculated_start_time = cursor;
        cursor = addMinutesToTime(cursor, stage.duration_minutes);
        return { ...stage, calculated_start_time, calculated_end_time: cursor };
      });
      return {
        ...block,
        stages: stagesWithTimes,
        block_start_time,
        block_end_time: cursor,
      };
    });
}
