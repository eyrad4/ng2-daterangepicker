import { TestBed } from '@angular/core/testing';

import { DaterangepickerConfig } from './ng2-daterangepicker.service';

describe('DaterangepickerConfig', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('exposes an empty settings object on construction', () => {
    const service = TestBed.inject(DaterangepickerConfig);
    expect(service.settings).toEqual({});
  });

  it('is a singleton: mutations persist across re-injections', () => {
    const first = TestBed.inject(DaterangepickerConfig);
    first.settings = { locale: { format: 'DD/MM/YYYY' } };

    const second = TestBed.inject(DaterangepickerConfig);
    expect(second).toBe(first);
    expect(second.settings.locale.format).toBe('DD/MM/YYYY');
  });
});
