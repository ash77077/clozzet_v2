export enum CustomerStatus {
  LEAD = 'Lead',
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

export interface ContactPerson {
  contactPerson: string;
  position?: string;
  phone?: string;
  email?: string;
  linkedinPage?: string;
}

export interface Customer {
  _id?: string;
  companyName: string;
  contactPerson: string;
  phone?: string;
  email?: string;
  contacts?: ContactPerson[];
  status: CustomerStatus;
  address?: string;
  website?: string;
  linkedinPage?: string;
  industry?: string;
  notes?: string;
  source?: string;
  lastContactedAt?: Date;
  nextFollowUpAt?: Date;
  scheduledMeetingAt?: Date;
  isActive: boolean;
  createdBy?: { _id?: string; firstName?: string; lastName?: string } | string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateCustomerDto {
  companyName: string;
  contactPerson: string;
  phone?: string;
  email?: string;
  status?: CustomerStatus;
  address?: string;
  website?: string;
  linkedinPage?: string;
  industry?: string;
  notes?: string;
  source?: string;
  nextFollowUpAt?: Date | string;
  lastContactedAt?: Date | string;
  scheduledMeetingAt?: Date | string;
}

export interface UpdateCustomerDto {
  companyName?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  status?: CustomerStatus;
  address?: string;
  website?: string;
  linkedinPage?: string;
  industry?: string;
  notes?: string;
  source?: string;
  nextFollowUpAt?: Date | string | null;
  lastContactedAt?: Date | string | null;
  scheduledMeetingAt?: Date | string | null;
}
