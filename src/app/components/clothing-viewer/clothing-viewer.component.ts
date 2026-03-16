import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';

@Component({
  selector: 'app-clothing-viewer',
  standalone: true,
  imports: [],
  templateUrl: './clothing-viewer.component.html',
  styleUrl: './clothing-viewer.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ClothingViewerComponent implements OnInit {

  ngOnInit(): void {
    // Import the @google/model-viewer script
    import('@google/model-viewer');
  }
}
