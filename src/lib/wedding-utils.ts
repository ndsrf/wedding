import type { Location, Wedding } from '@prisma/client';

type WeddingWithMainEventLocation = Pick<Wedding, 'location'> & {
  main_event_location: Pick<Location, 'name'> | null;
};

export function getWeddingDisplayLocation(wedding: WeddingWithMainEventLocation): string | null {
  return wedding.main_event_location?.name ?? wedding.location;
}
