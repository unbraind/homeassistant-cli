/**
 * Defines type-safe media contracts used by the Home Assistant API and CLI.
 */
export interface HaCalendar {
  entity_id: string;
  name: string;
}

export interface HaCalendarEvent {
  summary: string;
  start: {
    date?: string;
    dateTime?: string;
  };
  end: {
    date?: string;
    dateTime?: string;
  };
  description?: string;
  location?: string;
}
