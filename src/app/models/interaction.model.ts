export enum InteractionType {
  CALL = 'Call',
  EMAIL = 'Email',
  WHATSAPP = 'WhatsApp',
  TELEGRAM = 'Telegram',
  LINKEDIN = 'LinkedIn',
  IN_PERSON = 'In-person',
}

export enum CallOutcome {
  ANSWERED = 'Answered',
  BUSY = 'Busy',
  NO_ANSWER = 'No Answer',
  VOICEMAIL = 'Voicemail',
  FOLLOW_UP_NEEDED = 'Follow-up needed',
}

export interface Interaction {
  _id?: string;
  customerId: string;
  type: InteractionType;
  duration?: number;
  outcome?: CallOutcome;
  subject?: string;
  summary: string;
  attachments?: string[];
  interactionDate: Date;
  nextFollowUpDate?: Date;
  createdBy?: {
    _id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  createdByName?: string;
  isFollowUpCompleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateInteractionDto {
  customerId: string;
  type: InteractionType;
  duration?: number;
  outcome?: CallOutcome;
  subject?: string;
  summary: string;
  attachments?: string[];
  interactionDate?: Date | string;
  nextFollowUpDate?: Date | string;
}
