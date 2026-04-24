import { Component, ViewChild } from '@angular/core';
import { async, ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { DaterangepickerComponent } from './ng2-daterangepicker.component';
import { DaterangepickerConfig } from './ng2-daterangepicker.service';
import { DateRangePicker } from './vendor/daterangepicker';

@Component({
  template: `
    <input
      type="text"
      daterangepicker
      [options]="options"
      (selected)="lastSelected = $event"
      (cancelDaterangepicker)="lastCancel = $event"
      (applyDaterangepicker)="lastApply = $event"
      (hideCalendarDaterangepicker)="lastHideCalendar = $event"
      (showCalendarDaterangepicker)="lastShowCalendar = $event"
      (hideDaterangepicker)="lastHide = $event"
      (showDaterangepicker)="lastShow = $event"
    />
  `
})
class HostComponent {
  options: any = {};
  lastSelected: any;
  lastCancel: any;
  lastApply: any;
  lastHideCalendar: any;
  lastShowCalendar: any;
  lastHide: any;
  lastShow: any;
  @ViewChild(DaterangepickerComponent) directive!: DaterangepickerComponent;
}

function inputEl(fixture: ComponentFixture<HostComponent>): HTMLInputElement {
  return fixture.nativeElement.querySelector('input') as HTMLInputElement;
}

function fire(el: Element, type: string, picker?: any): void {
  el.dispatchEvent(new CustomEvent(type, { detail: { picker } }));
}

describe('DaterangepickerComponent (directive)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let config: DaterangepickerConfig;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DaterangepickerComponent, HostComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    config = TestBed.inject(DaterangepickerConfig);
    config.settings = {};
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    document.body.appendChild(fixture.nativeElement);
  });

  afterEach(() => {
    fixture.destroy();
    document.querySelectorAll('.daterangepicker').forEach((n) => { n.remove(); });
  });

  it('initializes the picker on the host input after view init', () => {
    fixture.detectChanges();
    const instance = DateRangePicker.getInstance(inputEl(fixture));
    expect(instance).toBeTruthy();
    expect(typeof instance!.show).toBe('function');
  });

  it('merges DaterangepickerConfig.settings with directive options (options win)', () => {
    config.settings = { locale: { format: 'YYYY/MM/DD' }, autoApply: true };
    host.options = { locale: { format: 'DD-MM-YYYY' } };
    fixture.detectChanges();

    const instance = DateRangePicker.getInstance(inputEl(fixture))!;
    expect(instance.locale.format).toBe('DD-MM-YYYY');
    expect(instance.autoApply).toBe(true);
  });

  it('emits selected with {start, end, label} when the picker callback fires', () => {
    fixture.detectChanges();
    const start = { tag: 'start' };
    const end = { tag: 'end' };
    (host.directive as any).callback(start, end, 'Custom Range');
    expect(host.lastSelected).toEqual({ start, end, label: 'Custom Range' });
  });

  const namespacedEvents: Array<{ event: string; sink: keyof HostComponent }> = [
    { event: 'apply.daterangepicker',        sink: 'lastApply' },
    { event: 'cancel.daterangepicker',       sink: 'lastCancel' },
    { event: 'show.daterangepicker',         sink: 'lastShow' },
    { event: 'hide.daterangepicker',         sink: 'lastHide' },
    { event: 'showCalendar.daterangepicker', sink: 'lastShowCalendar' },
    { event: 'hideCalendar.daterangepicker', sink: 'lastHideCalendar' }
  ];

  namespacedEvents.forEach(({ event, sink }) => {
    it(`re-emits ${event} as @Output ${String(sink)}`, () => {
      fixture.detectChanges();
      const pickerStub = { tag: event };
      fire(inputEl(fixture), event, pickerStub);

      expect(host[sink]).toBeDefined();
      expect((host[sink] as any).picker).toBe(pickerStub);
    });
  });

  it('applies customClasses to the picker container', () => {
    host.options = { customClasses: ['demo-skin', 'extra-skin'] };
    fixture.detectChanges();

    const instance = DateRangePicker.getInstance(inputEl(fixture))!;
    expect(instance.container.classList.contains('demo-skin')).toBe(true);
    expect(instance.container.classList.contains('extra-skin')).toBe(true);
  });

  it('re-renders the picker when options reference changes', fakeAsync(() => {
    host.options = { locale: { format: 'YYYY-MM-DD' } };
    fixture.detectChanges();
    tick();
    let instance = DateRangePicker.getInstance(inputEl(fixture))!;
    expect(instance.locale.format).toBe('YYYY-MM-DD');

    host.options = { locale: { format: 'DD/MM/YYYY' } };
    fixture.detectChanges();
    tick();
    instance = DateRangePicker.getInstance(inputEl(fixture))!;
    expect(instance.locale.format).toBe('DD/MM/YYYY');
  }));

  it('removes the picker container from the DOM on destroy', () => {
    fixture.detectChanges();
    expect(document.querySelectorAll('.daterangepicker').length).toBeGreaterThan(0);

    fixture.destroy();
    expect(document.querySelectorAll('.daterangepicker').length).toBe(0);
  });
});
