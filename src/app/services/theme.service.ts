import { Injectable, signal, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

const THEME_STORAGE_KEY = 'theme';
const DARK_CLASS = 'dark-mode';

type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);

  /** Writable signal reflecting the current theme. Defaults to light. */
  readonly isDark = signal<boolean>(false);

  /**
   * Reads the persisted preference from localStorage (if any) and applies the
   * appropriate class to <body>. Should be called once at app bootstrap.
   */
  initTheme(): void {
    const stored = this.readStoredTheme();
    const shouldBeDark = stored === 'dark';
    this.applyTheme(shouldBeDark);
    this.isDark.set(shouldBeDark);
  }

  /** Flips the current theme, persists it, and updates the DOM. */
  toggleTheme(): void {
    const next = !this.isDark();
    this.isDark.set(next);
    this.applyTheme(next);
    this.persistTheme(next ? 'dark' : 'light');
  }

  // ─── internals ────────────────────────────────────────────────────────────

  private applyTheme(dark: boolean): void {
    const body = this.doc.body;
    if (!body) {
      return;
    }
    if (dark) {
      body.classList.add(DARK_CLASS);
    } else {
      body.classList.remove(DARK_CLASS);
    }
  }

  private readStoredTheme(): ThemeMode | null {
    try {
      const value = this.doc.defaultView?.localStorage?.getItem(THEME_STORAGE_KEY);
      return value === 'dark' || value === 'light' ? value : null;
    } catch {
      return null;
    }
  }

  private persistTheme(mode: ThemeMode): void {
    try {
      this.doc.defaultView?.localStorage?.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      /* localStorage unavailable (SSR / private mode) — ignore */
    }
  }
}
