export enum Priority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface PriorityConfig {
  class: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  shadowColor: string;
}

export const PRIORITY_CONFIGS: Record<Priority, PriorityConfig> = {
  [Priority.LOW]: {
    class: 'priority-low',
    color: '#155724',
    backgroundColor: 'linear-gradient(135deg, #d5edda 0%, #c3e6cb 100%)',
    borderColor: '#27ae60',
    shadowColor: 'rgba(39, 174, 96, 0.2)'
  },
  [Priority.NORMAL]: {
    class: 'priority-normal',
    color: '#0c5460',
    backgroundColor: 'linear-gradient(135deg, #e8f4fd 0%, #d1ecf1 100%)',
    borderColor: '#3498db',
    shadowColor: 'rgba(52, 152, 219, 0.2)'
  },
  [Priority.HIGH]: {
    class: 'priority-high',
    color: '#856404',
    backgroundColor: 'linear-gradient(135deg, #fff4e6 0%, #ffeeba 100%)',
    borderColor: '#f39c12',
    shadowColor: 'rgba(243, 156, 18, 0.2)'
  },
  [Priority.URGENT]: {
    class: 'priority-urgent',
    color: '#721c24',
    backgroundColor: 'linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)',
    borderColor: '#e74c3c',
    shadowColor: 'rgba(231, 76, 60, 0.2)'
  }
};

export function getPriorityClass(priority: string): string {
  const normalizedPriority = priority.toLowerCase() as Priority;
  return PRIORITY_CONFIGS[normalizedPriority]?.class || PRIORITY_CONFIGS[Priority.NORMAL].class;
}

export function getPriorityConfig(priority: string): PriorityConfig {
  const normalizedPriority = priority.toLowerCase() as Priority;
  return PRIORITY_CONFIGS[normalizedPriority] || PRIORITY_CONFIGS[Priority.NORMAL];
}

export function getPriorityDisplayName(priority: string): string {
  const displayNames = {
    [Priority.LOW]: 'Low Priority',
    [Priority.NORMAL]: 'Normal Priority',
    [Priority.HIGH]: 'High Priority',
    [Priority.URGENT]: 'Urgent'
  };
  const normalizedPriority = priority.toLowerCase() as Priority;
  return displayNames[normalizedPriority] || displayNames[Priority.NORMAL];
}