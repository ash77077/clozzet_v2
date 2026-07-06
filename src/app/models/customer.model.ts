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

export interface AssignmentLogEntry {
  changedBy: { _id?: string; firstName?: string; lastName?: string } | string;
  changedByName: string;
  fromUser: { _id?: string; firstName?: string; lastName?: string } | string | null;
  fromUserName: string | null;
  toUser: { _id?: string; firstName?: string; lastName?: string } | string | null;
  toUserName: string | null;
  changedAt: Date;
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
  assignedTo?: { _id?: string; firstName?: string; lastName?: string } | string | null;
  assignmentLog?: AssignmentLogEntry[];
  deletedBy?: { _id?: string; firstName?: string; lastName?: string } | string;
  deleteReason?: string;
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
