export interface HaPerson {
  id: string;
  name: string;
  device_trackers: string[];
  user_id?: string | null;
  picture?: string | null;
}

export interface HaZone {
  entity_id: string;
  latitude: number;
  longitude: number;
  radius: number;
  passive: boolean;
  name: string;
  icon?: string | null;
  picture?: string | null;
}
