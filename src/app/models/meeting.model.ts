export enum MeetingStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export interface Meeting {
  _id?: string;
  title: string;
  customerName: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  meetingDate: string; // ISO string
  duration?: number; // minutes
  notes?: string;
  status: MeetingStatus;
  createdBy?: string;
  createdByName?: string;
  customerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMeetingDto {
  title: string;
  customerName: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  meetingDate: string;
  duration?: number;
  notes?: string;
  status?: MeetingStatus;
  customerId?: string;
}
