export interface Event {
  event_id: number;
  title: string;
  event_time: string; // ISO 8601 string representation (or Date if parsed)
  event_poster_path: string;
  event_link: string;
  has_occurred: boolean;
}
