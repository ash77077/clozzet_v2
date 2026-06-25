import { Directive, ElementRef, HostListener, Input, OnChanges } from '@angular/core';
import { TooltipOptions } from 'primeng/api';

// Shows pTooltip only when the element's text is actually truncated (scrollWidth > clientWidth)
@Directive({
  selector: '[overflowTooltip]',
  standalone: true,
  host: {
    '[attr.title]': 'null', // prevent native tooltip
  }
})
export class OverflowTooltipDirective implements OnChanges {
  @Input('overflowTooltip') tooltipText: string = '';

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnChanges() {
    this.update();
  }

  @HostListener('mouseenter')
  onMouseEnter() {
    this.update();
  }

  private update() {
    const el = this.el.nativeElement;
    const isOverflowing = el.scrollWidth > el.clientWidth;
    el.title = isOverflowing ? this.tooltipText : '';
  }
}
