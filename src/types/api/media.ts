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
