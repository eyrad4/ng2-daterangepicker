import { Injectable, signal } from '@angular/core';
import type { DateRangePickerOptions } from './picker/types';

@Injectable({
  providedIn: 'root'
})
export class DaterangepickerConfig {
  private readonly _settings = signal<DateRangePickerOptions>({});
  readonly settings = this._settings.asReadonly();

  setSettings(value: DateRangePickerOptions): void {
    this._settings.set(value);
  }

  updateSettings(partial: Partial<DateRangePickerOptions>): void {
    this._settings.update(s => ({ ...s, ...partial }));
  }
}
