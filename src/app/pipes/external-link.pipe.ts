import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'externalLink',
  standalone: true
})
export class ExternalLinkPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    return value.startsWith('http') ? value : `https://${value}`;
  }
}