export interface EventAttendee {
  event_id: number | string; // pg returns BIGINT as string in JSON by default
  email: string;
  first_name: string | null;
  last_name: string | null;
  account_type: string | null;
  year_of_graduation: string | null;
  is_member: boolean;
  membership_degree: string | null;
  rsvped: boolean;
  registration_type: string | null;
  quantity: number;
  registration_status: string | null;
  registration_date: string | null; // ISO date string from JSON
  custom_field_required: string | null;
  custom_notes: string | null;
  officers_notes: string | null;
  checked_in: boolean;
  checked_in_at: string | null; // ISO date string from JSON
  no_show: boolean;
  rsvped_at: string | null; // ISO date string from JSON
  attendees_net_id: string | null;
}
export type AttendeePair = [string, string, number];

export interface AttendeeStats {
  displayName: string;
  count: number;
}
