# Google Analytics 4 Integration Guide

This guide shows you how to use Google Analytics 4 in your Angular application using ngx-google-analytics.

## 📦 Installation

The package has already been installed:

```bash
npm install ngx-google-analytics
```

## 🔧 Configuration

### 1. Environment Setup

Your GA4 Measurement ID is configured in:
- `src/environments/environment.ts` (development)
- `src/environments/environment.prod.ts` (production)

**⚠️ IMPORTANT:** Replace `'G-XXXXXXXXXX'` with your actual Google Analytics 4 Measurement ID.

You can find your Measurement ID in Google Analytics:
- Go to **Admin** → **Data Streams** → Select your stream
- Copy the **Measurement ID** (starts with `G-`)

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  googleAnalyticsId: 'G-YOUR-ACTUAL-ID-HERE' // ⬅️ Replace this!
};
```

### 2. App Configuration (Standalone Setup)

The Google Analytics provider is already configured in `src/app/app.config.ts`:

```typescript
import { importProvidersFrom } from '@angular/core';
import { NgxGoogleAnalyticsModule, NgxGoogleAnalyticsRouterModule } from 'ngx-google-analytics';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    // ... other providers

    // Google Analytics 4 Configuration for Standalone Apps
    importProvidersFrom([
      NgxGoogleAnalyticsModule.forRoot(environment.googleAnalyticsId),
      NgxGoogleAnalyticsRouterModule // Auto-tracks route changes
    ])
  ]
};
```

### Alternative: Module-Based Setup (app.module.ts)

If you're using a traditional module-based Angular app, configure in `app.module.ts`:

```typescript
import { NgxGoogleAnalyticsModule, NgxGoogleAnalyticsRouterModule } from 'ngx-google-analytics';
import { environment } from '../environments/environment';

@NgModule({
  imports: [
    // ... other imports
    NgxGoogleAnalyticsModule.forRoot(environment.googleAnalyticsId),
    NgxGoogleAnalyticsRouterModule
  ]
})
export class AppModule { }

## 📊 Automatic Page View Tracking

✅ **Already enabled!** All route changes are automatically tracked as page views.

When users navigate between pages (e.g., `/home` → `/dashboard`), GA4 automatically records:
- Page URL
- Page title
- Timestamp
- User session data

No additional code needed! 🎉

---

## 🎯 Custom Event Tracking

### Method 1: HTML Template (Directive Approach)

Use the `gaEvent` directive directly in your HTML templates:

```html
<!-- Example: Track button clicks -->
<button
  gaEvent="click_customize_model"
  gaCategory="User Actions"
  gaLabel="3D Configurator"
  gaValue="1">
  Customize 3D Model
</button>

<!-- Example: Track navigation clicks -->
<button
  (click)="navigateToDashboard()"
  gaEvent="view_dashboard"
  gaCategory="Navigation"
  gaLabel="Dashboard Access">
  View Dashboard
</button>

<!-- Example: Track form submissions -->
<form (ngSubmit)="onSubmit()">
  <button
    type="submit"
    gaEvent="submit_order_form"
    gaCategory="Forms"
    gaLabel="Order Creation"
    gaValue="100">
    Place Order
  </button>
</form>

<!-- Example: Track file uploads -->
<input
  type="file"
  (change)="onFileUpload($event)"
  gaEvent="upload_logo"
  gaCategory="File Operations"
  gaLabel="Logo Upload">
```

**Directive Attributes:**
- `gaEvent` (required): Name of the event (e.g., "click_customize_model")
- `gaCategory` (optional): Event category (e.g., "User Actions")
- `gaLabel` (optional): Event label (e.g., "3D Configurator")
- `gaValue` (optional): Numeric value (e.g., order amount, quantity)

---

### Method 2: TypeScript Component (Programmatic Approach)

Inject `GoogleAnalyticsService` and call `event()` method:

```typescript
import { Component } from '@angular/core';
import { GoogleAnalyticsService } from 'ngx-google-analytics';

@Component({
  selector: 'app-example',
  standalone: true,
  templateUrl: './example.component.html'
})
export class ExampleComponent {

  // Inject the Google Analytics service
  constructor(private gaService: GoogleAnalyticsService) {}

  // Example 1: Track button click
  onCustomizeModel(): void {
    // Track the event
    this.gaService.event('click_customize_model', {
      event_category: 'User Actions',
      event_label: '3D Configurator Button',
      value: 1
    });

    // Your business logic here
    console.log('Opening 3D configurator...');
  }

  // Example 2: Track navigation
  navigateToDashboard(): void {
    this.gaService.event('view_dashboard', {
      event_category: 'Navigation',
      event_label: 'Dashboard Access'
    });

    // Navigate to dashboard
    // this.router.navigate(['/dashboard']);
  }

  // Example 3: Track form submission with data
  submitOrderForm(orderData: any): void {
    this.gaService.event('submit_order_form', {
      event_category: 'Forms',
      event_label: 'Order Creation',
      value: orderData.totalAmount,
      order_id: orderData.id,
      items_count: orderData.items.length
    });

    // Submit form logic
    console.log('Order submitted:', orderData);
  }

  // Example 4: Track file upload
  onLogoUpload(file: File): void {
    this.gaService.event('upload_logo', {
      event_category: 'File Operations',
      event_label: 'Logo Upload',
      file_type: file.type,
      file_size_kb: Math.round(file.size / 1024)
    });

    // Process file upload
    console.log('Logo uploaded:', file.name);
  }

  // Example 5: Track successful actions
  onDesignSaved(): void {
    this.gaService.event('save_design', {
      event_category: 'User Actions',
      event_label: 'Design Saved Successfully',
      value: 1
    });
  }

  // Example 6: Track errors
  onErrorOccurred(errorMessage: string): void {
    this.gaService.event('error_occurred', {
      event_category: 'Errors',
      event_label: errorMessage,
      fatal: false
    });
  }

  // Example 7: Track color changes in configurator
  onColorChange(partName: string, color: string): void {
    this.gaService.event('change_part_color', {
      event_category: 'Configurator',
      event_label: `${partName} - ${color}`,
      part_name: partName,
      color_value: color
    });
  }

  // Example 8: Track logo transformation
  onLogoTransform(mode: 'move' | 'rotate' | 'scale'): void {
    this.gaService.event('transform_logo', {
      event_category: 'Configurator',
      event_label: `Logo ${mode}`,
      transform_mode: mode
    });
  }
}
```

---

## 🎨 Real-World Examples for Clozzet Configurator

### In your configurator component:

```typescript
// src/app/components/configurator/configurator.component.ts
import { GoogleAnalyticsService } from 'ngx-google-analytics';

export class ConfiguratorComponent {
  constructor(private gaService: GoogleAnalyticsService) {}

  // Track when user changes global cloth color
  onGlobalColorChange(event: Event): void {
    const color = (event.target as HTMLInputElement).value;

    this.gaService.event('change_global_color', {
      event_category: 'Configurator',
      event_label: 'Global Color Change',
      color_value: color
    });

    // Your existing logic
    this.globalClothColor = color;
    // ... rest of your code
  }

  // Track when user places a logo
  private addDecal(position: THREE.Vector3, normal: THREE.Vector3, targetMesh: THREE.Mesh): void {
    this.gaService.event('place_logo', {
      event_category: 'Configurator',
      event_label: 'Logo Placed on Model',
      value: 1
    });

    // Your existing decal logic
    // ... rest of your code
  }

  // Track transform mode changes
  setTransformMode(mode: 'translate' | 'rotate' | 'scale'): void {
    this.gaService.event('set_transform_mode', {
      event_category: 'Configurator',
      event_label: `Transform Mode: ${mode}`,
      mode: mode
    });

    this.transformMode = mode;
    this.transformControl.setMode(mode);
  }

  // Track design export
  exportProductionData(): void {
    this.gaService.event('export_design', {
      event_category: 'Production',
      event_label: 'Design Exported',
      value: 1,
      has_logo: this.hasLogo,
      parts_count: this.meshParts.length
    });

    // Your existing export logic
    // ... rest of your code
  }
}
```

---

## 📈 Viewing Your Data

1. Go to [Google Analytics](https://analytics.google.com/)
2. Select your property
3. Navigate to **Reports** → **Engagement** → **Events**
4. You'll see all your tracked events with their parameters

---

## 🔍 Common Event Examples

| Event Name              | Category        | When to Use                      |
|-------------------------|-----------------|----------------------------------|
| `click_customize_model` | User Actions    | User clicks "Customize 3D Model" |
| `view_dashboard`        | Navigation      | User navigates to dashboard      |
| `submit_order_form`     | Forms           | User submits an order            |
| `upload_logo`           | File Operations | User uploads a logo              |
| `change_part_color`     | Configurator    | User changes garment part color  |
| `transform_logo`        | Configurator    | User moves/rotates/scales logo   |
| `export_design`         | Production      | User exports design data         |
| `error_occurred`        | Errors          | Application error happens        |

---

## ✅ Best Practices

1. **Use descriptive event names**: `click_customize_model` instead of `click1`
2. **Keep categories consistent**: Use "User Actions", "Navigation", "Forms", etc.
3. **Add meaningful labels**: Include context like "3D Configurator Button"
4. **Track value when relevant**: Order amounts, item counts, etc.
5. **Don't over-track**: Only track meaningful user interactions
6. **Test in development**: Check browser console for GA events

---

## 🚀 You're All Set!

Your Angular application now has:
- ✅ Google Analytics 4 integrated
- ✅ Automatic page view tracking
- ✅ Custom event tracking ready to use
- ✅ Secure configuration via environment files

**Next steps:**
1. Replace `'G-XXXXXXXXXX'` with your real GA4 Measurement ID
2. Add custom events to your components
3. Test in development (check browser Network tab for GA requests)
4. Deploy and monitor your analytics!

---

## 🆘 Need Help?

- [ngx-google-analytics Documentation](https://github.com/maxandriani/ngx-google-analytics)
- [Google Analytics 4 Events Guide](https://support.google.com/analytics/answer/9267735)
- [GA4 Event Builder](https://ga-dev-tools.web.app/ga4/event-builder/)
