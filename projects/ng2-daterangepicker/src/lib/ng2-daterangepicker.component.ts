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
import * as momentNamespace from "moment";
import { DateRangePicker } from "./picker/daterangepicker";
import { Cleanup, on } from "./picker/dom-utils";
import { DaterangepickerConfig } from "./ng2-daterangepicker.service";
import type { DateRangePickerOptions, PickerOutputEvent } from "./picker/types";

const moment =
  ((momentNamespace as unknown as { default?: typeof momentNamespace }).default ??
    momentNamespace) as typeof momentNamespace;

const DATE_KEYS = new Set<keyof DateRangePickerOptions>(["startDate", "endDate"]);

@Directive({
  selector: "[daterangepicker]",
  standalone: true,
})
export class DaterangepickerComponent implements AfterViewInit, OnDestroy {
  private activeRange: { start: Moment; end: Moment; label?: string } | null =
    null;

  private lastAppliedOpts: Partial<DateRangePickerOptions> = {};

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
        const hasInputs =
          Object.keys(opts).length > 0 || Object.keys(settings).length > 0;
        if (this.datePicker && !hasInputs) return;

        this.render(opts, settings);
        this.attachEvents();
      });
    });
  }

  ngAfterViewInit(): void {
    this.viewInitialized.set(true);
  }

  updateOptions(partial: Partial<DateRangePickerOptions>): void {
    const changed = this.diffChangedKeys(partial);
    const dateOnly =
      this.datePicker !== null &&
      changed.length > 0 &&
      changed.every((k) => DATE_KEYS.has(k as keyof DateRangePickerOptions));

    if (!dateOnly) {
      const opts = Object.assign({}, this.options(), partial);
      this.render(opts, this.config.settings());
      this.attachEvents();
      return;
    }

    const p = this.datePicker!;
    if (changed.includes("startDate")) {
      p.setStartDate(partial.startDate as string | Moment | Date);
      this.lastAppliedOpts.startDate = partial.startDate;
    }
    if (changed.includes("endDate")) {
      p.setEndDate(partial.endDate as string | Moment | Date);
      this.lastAppliedOpts.endDate = partial.endDate;
    }
  }

  private diffChangedKeys(partial: Partial<DateRangePickerOptions>): string[] {
    const changed: string[] = [];
    for (const key of Object.keys(partial)) {
      const a = (partial as Record<string, unknown>)[key];
      const b = (this.lastAppliedOpts as Record<string, unknown>)[key];
      if (DATE_KEYS.has(key as keyof DateRangePickerOptions)) {
        if (!datesEqual(a, b)) changed.push(key);
      } else if (!valuesEqual(a, b)) {
        changed.push(key);
      }
    }
    return changed;
  }

  ngOnDestroy(): void {
    this.destroyPicker();
  }

  private render(
    opts: DateRangePickerOptions,
    settings: DateRangePickerOptions,
  ): void {
    const targetOptions = Object.assign({}, settings, opts);
    this.lastAppliedOpts = { ...targetOptions };
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

    const hasExplicitDates =
      targetOptions.startDate != null || targetOptions.endDate != null;
    if (this.activeRange && !hasExplicitDates) {
      this.datePicker.setStartDate(this.activeRange.start);
      this.datePicker.setEndDate(this.activeRange.end);
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

function datesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  // moment() accepts string | Date | Moment | number — all our valid date inputs
  const ta = +(moment as unknown as (v: unknown) => Moment)(a);
  const tb = +(moment as unknown as (v: unknown) => Moment)(b);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return false;
  return ta === tb;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a === "function" || typeof b === "function") return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}
