import {
  Directive,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  inject,
  input,
  output,
  effect,
  signal,
  untracked,
} from "@angular/core";
import type { Moment } from "moment";
import { DateRangePicker } from "./picker/daterangepicker";
import { Cleanup, on } from "./picker/dom-utils";
import { DaterangepickerConfig } from "./ng2-daterangepicker.service";
import type { DateRangePickerOptions, PickerOutputEvent } from "./picker/types";

@Directive({
  selector: "[daterangepicker]",
  standalone: true,
})
export class DaterangepickerComponent implements AfterViewInit, OnDestroy {
  private activeRange: { start: Moment; end: Moment; label?: string } | null =
    null;

  private eventCleanups: Cleanup[] = [];

  private viewInitialized = signal(false);

  private readonly el = inject(ElementRef<HTMLElement>);

  private readonly config = inject(DaterangepickerConfig);

  options = input<DateRangePickerOptions>({});

  selected = output<{ start: Moment; end: Moment; label?: string }>();

  cancelDaterangepicker = output<PickerOutputEvent>();

  applyDaterangepicker = output<PickerOutputEvent>();

  hideCalendarDaterangepicker = output<PickerOutputEvent>();

  showCalendarDaterangepicker = output<PickerOutputEvent>();

  hideDaterangepicker = output<PickerOutputEvent>();

  showDaterangepicker = output<PickerOutputEvent>();

  renderDaterangepicker = output<void>();

  public datePicker: DateRangePicker | null = null;

  constructor() {
    effect(() => {
      if (!this.viewInitialized()) return;
      const opts = this.options();
      const settings = this.config.settings();
      untracked(() => {
        this.render(opts, settings);
        this.attachEvents();
        if (this.activeRange && this.datePicker) {
          this.datePicker.setStartDate(this.activeRange.start);
          this.datePicker.setEndDate(this.activeRange.end);
        }
      });
    });
  }

  ngAfterViewInit(): void {
    this.viewInitialized.set(true);
  }

  updateOptions(partial: Partial<DateRangePickerOptions>): void {
    const opts = Object.assign({}, this.options(), partial);
    this.render(opts, this.config.settings());
    this.attachEvents();
    if (this.activeRange && this.datePicker) {
      this.datePicker.setStartDate(this.activeRange.start);
      this.datePicker.setEndDate(this.activeRange.end);
    }
  }

  ngOnDestroy(): void {
    this.destroyPicker();
  }

  private render(
    opts: DateRangePickerOptions,
    settings: DateRangePickerOptions,
  ): void {
    const targetOptions = Object.assign({}, settings, opts);
    this.destroyPicker();

    this.datePicker = new DateRangePicker(
      this.el.nativeElement,
      targetOptions,
      (start: Moment, end: Moment, label?: string) =>
        this.onPickerSelect(start, end, label),
    );

    if (opts.customClasses?.length) {
      const classes: string[] = Array.isArray(opts.customClasses)
        ? opts.customClasses
        : [opts.customClasses];
      for (const customClass of classes) {
        this.datePicker.container.classList.add(customClass);
      }
    }

    this.renderDaterangepicker.emit();
  }

  private onPickerSelect(start?: Moment, end?: Moment, label?: string): void {
    this.activeRange = { start: start as Moment, end: end as Moment, label };
    this.selected.emit(this.activeRange);
  }

  private destroyPicker(): void {
    this.eventCleanups.forEach((c) => {
      c();
    });
    this.eventCleanups = [];
    if (this.datePicker) {
      try {
        this.datePicker.remove();
      } catch (_e) {
        /* already detached */
      }
      this.datePicker = null;
    }
  }

  private attachEvents(): void {
    this.eventCleanups.forEach((c) => {
      c();
    });
    this.eventCleanups = [];

    const el: HTMLElement = this.el.nativeElement;
    const wire = (
      eventName: string,
      sink: ReturnType<typeof output<PickerOutputEvent>>,
    ) => {
      this.eventCleanups.push(
        on(el, eventName, (e: Event) => {
          sink.emit({
            event: e as CustomEvent,
            picker: (e as CustomEvent).detail?.picker,
          });
        }),
      );
    };

    wire("cancel.daterangepicker", this.cancelDaterangepicker);
    wire("apply.daterangepicker", this.applyDaterangepicker);
    wire("hideCalendar.daterangepicker", this.hideCalendarDaterangepicker);
    wire("showCalendar.daterangepicker", this.showCalendarDaterangepicker);
    wire("hide.daterangepicker", this.hideDaterangepicker);
    wire("show.daterangepicker", this.showDaterangepicker);
  }
}
