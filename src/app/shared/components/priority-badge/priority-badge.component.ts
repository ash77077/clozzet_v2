import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getPriorityClass, getPriorityDisplayName } from '../../utils/priority.utils';

@Component({
  selector: 'app-priority-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span 
      class="priority-badge" 
      [class]="getPriorityClass(priority)"
      [attr.title]="getPriorityDisplayName(priority)">
      <span class="priority-indicator" [class]="priority.toLowerCase()"></span>
      <span class="priority-text">{{ showText ? getPriorityDisplayName(priority) : priority.toUpperCase() }}</span>
    </span>
  `,
  styleUrls: ['./priority-badge.component.scss']
})
export class PriorityBadgeComponent {
  @Input() priority: string = 'normal';
  @Input() showText: boolean = true;
  @Input() showIndicator: boolean = true;

  getPriorityClass = getPriorityClass;
  getPriorityDisplayName = getPriorityDisplayName;
}