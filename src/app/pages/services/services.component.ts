import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ServicesComponent as ServicesShowcaseComponent } from '../../components/services/services.component';

@Component({
  selector: 'app-services-page',
  standalone: true,
  imports: [CommonModule, TranslateModule, ServicesShowcaseComponent],
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.scss']
})
export class ServicesPageComponent {
}