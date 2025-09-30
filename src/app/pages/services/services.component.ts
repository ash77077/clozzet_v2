import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServicesComponent as ServicesShowcaseComponent } from '../../components/services/services.component';

@Component({
  selector: 'app-services-page',
  standalone: true,
  imports: [CommonModule, ServicesShowcaseComponent],
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.scss']
})
export class ServicesPageComponent {
}