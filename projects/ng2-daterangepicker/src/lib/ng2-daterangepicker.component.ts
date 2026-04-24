import {
  Directive,
  AfterViewInit,
  OnDestroy,
  DoCheck,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  KeyValueDiffers
} from '@angular/core';
import { DateRangePicker } from './vendor/daterangepicker';
import { Cleanup, on } from './vendor/dom-utils';
import { DaterangepickerConfig } from './ng2-daterangepicker.service';

@Directive({
  selector: '[daterangepicker]'
})
export class DaterangepickerComponent implements AfterViewInit, OnDestroy, DoCheck {

  private activeRange: any;
  private targetOptions: any = {};
  private _differ: any = {};
  private eventCleanups: Cleanup[] = [];

  public datePicker: DateRangePicker | null = null;

  @Input() options: any = {};

  @Output() selected = new EventEmitter();
  @Output() cancelDaterangepicker = new EventEmitter();
  @Output() applyDaterangepicker = new EventEmitter();
  @Output() hideCalendarDaterangepicker = new EventEmitter();
  @Output() showCalendarDaterangepicker = new EventEmitter();
  @Output() hideDaterangepicker = new EventEmitter();
  @Output() showDaterangepicker = new EventEmitter();

  constructor(
    private input: ElementRef,
    private config: DaterangepickerConfig,
    private differs: KeyValueDiffers
  ) {
    this._differ['options'] = this.differs.find(this.options).create();
    this._differ['settings'] = this.differs.find(this.config.settings).create();
  }

  ngAfterViewInit() {
    this.render();
    this.attachEvents();
  }

  ngDoCheck() {
    const optionsChanged = this._differ['options'].diff(this.options);
    const settingsChanged = this._differ['settings'].diff(this.config.settings);

    if (optionsChanged || settingsChanged) {
      this.render();
      this.attachEvents();
      if (this.activeRange && this.datePicker) {
        this.datePicker.setStartDate(this.activeRange.start);
        this.datePicker.setEndDate(this.activeRange.end);
      }
    }
  }

  ngOnDestroy() {
    this.destroyPicker();
  }

  private render(): void {
    this.targetOptions = Object.assign({}, this.config.settings, this.options);

    // Replace any existing instance before creating a new one
    this.destroyPicker();

    this.datePicker = new DateRangePicker(
      this.input.nativeElement,
      this.targetOptions,
      this.callback.bind(this)
    );

    if (this.options.customClasses && this.options.customClasses.length) {
      const classes: string[] = Array.isArray(this.options.customClasses)
        ? this.options.customClasses
        : [this.options.customClasses];
      for (const customClass of classes) {
        this.datePicker.container.classList.add(customClass);
      }
    }
  }

  private callback(start?: any, end?: any, label?: any): void {
    this.activeRange = { start, end, label };
    this.selected.emit(this.activeRange);
  }

  private destroyPicker(): void {
    this.eventCleanups.forEach((c) => { c(); });
    this.eventCleanups = [];
    if (this.datePicker) {
      try { this.datePicker.remove(); } catch (e) { /* picker may already be detached */ }
      this.datePicker = null;
    }
  }

  private attachEvents(): void {
    this.eventCleanups.forEach((c) => { c(); });
    this.eventCleanups = [];

    const el: HTMLElement = this.input.nativeElement;
    const wire = (eventName: string, sink: EventEmitter<any>) => {
      this.eventCleanups.push(on(el, eventName, (e: CustomEvent) => {
        sink.emit({ event: e, picker: e.detail?.picker });
      }));
    };

    wire('cancel.daterangepicker', this.cancelDaterangepicker);
    wire('apply.daterangepicker', this.applyDaterangepicker);
    wire('hideCalendar.daterangepicker', this.hideCalendarDaterangepicker);
    wire('showCalendar.daterangepicker', this.showCalendarDaterangepicker);
    wire('hide.daterangepicker', this.hideDaterangepicker);
    wire('show.daterangepicker', this.showDaterangepicker);
  }
}
