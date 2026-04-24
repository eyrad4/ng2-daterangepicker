/**
 * Vendored from https://github.com/dangrossman/daterangepicker (v3.1.0).
 * Original copyright (c) 2012-2019 Dan Grossman, MIT License.
 *
 * Phase 3 rewrite: jQuery removed. The plugin is a TypeScript class with
 * native DOM APIs and CustomEvents. The on-element events keep their upstream
 * names (`apply.daterangepicker`, etc.); the picker instance is delivered via
 * `event.detail.picker` rather than the second handler arg.
 *
 * Static lookup: `DateRangePicker.getInstance(element)`.
 *
 * This file is intentionally the orchestrator/facade. The implementation lives
 * in sub-controllers: CalendarController, TimePickerController, RangesController,
 * LifecycleController, InputBinding. Heavy lifting for rendering and options
 * lives in sibling modules. See `dom-utils` for native-DOM helpers and `types`
 * for shared interfaces.
 */
import * as momentNamespace from "moment";
import type { Moment, DurationInputObject, MomentInput, MomentFormatSpecification } from "moment";
import { CalendarController } from "./calendar-controller";
import { DEFAULT_TEMPLATE, defaultLocale } from "./constants";
import {
  Cleanup,
  delegate,
  fromHTML,
  on,
  trigger,
} from "./dom-utils";
import { InputBinding } from "./input-binding";
import { LifecycleController } from "./lifecycle-controller";
import {
  applyOptions,
  buildRangesListHtml,
  mergeRawOptions,
  resolveParent,
} from "./options";
import { RangesController } from "./ranges-controller";
import { TimePickerController } from "./time-picker-controller";
import type {
  CalendarMeta,
  CalendarSide,
  DateRangePickerOptions,
  DrpDrops,
  DrpOpens,
  Locale,
  PickerCallback,
} from "./types";

// With moduleResolution:bundler, `import *` of a CJS `export =` module loses call signatures.
// Intersect with explicit overloads so the factory call typechecks.
type MomentFn = typeof momentNamespace & {
  (inp?: MomentInput, strict?: boolean): Moment;
  (inp?: MomentInput, format?: MomentFormatSpecification, strict?: boolean): Moment;
  (inp?: MomentInput, format?: MomentFormatSpecification, language?: string, strict?: boolean): Moment;
};
const moment = ((momentNamespace as any).default ?? momentNamespace) as MomentFn;

const INSTANCES = new WeakMap<Element, DateRangePicker>();

export class DateRangePicker {
  static getInstance(element: Element): DateRangePicker | undefined {
    return INSTANCES.get(element);
  }

  // ---- public state ----
  element: HTMLElement;
  container!: HTMLElement;
  parentEl!: HTMLElement;
  startDate!: Moment;
  endDate!: Moment;
  minDate: Moment | false = false;
  maxDate: Moment | false = false;
  maxSpan: DurationInputObject | false = false;
  autoApply = false;
  singleDatePicker = false;
  showDropdowns = false;
  minYear!: number | string;
  maxYear!: number | string;
  showWeekNumbers = false;
  showISOWeekNumbers = false;
  showCustomRangeLabel = true;
  timePicker = false;
  timePicker24Hour = false;
  timePickerIncrement = 1;
  timePickerSeconds = false;
  linkedCalendars = true;
  autoUpdateInput = true;
  alwaysShowCalendars = false;
  ranges: Record<string, [Moment, Moment]> = {};
  opens: DrpOpens = "right";
  drops: DrpDrops = "down";
  buttonClasses = "btn btn-sm";
  applyButtonClasses = "btn-primary";
  cancelButtonClasses = "btn-default";
  locale!: Locale;
  callback: PickerCallback = () => {
    /* noop */
  };
  isShowing = false;
  leftCalendar: CalendarMeta = {};
  rightCalendar: CalendarMeta = {};
  chosenLabel: string | null = null;
  oldStartDate!: Moment;
  oldEndDate!: Moment;
  previousRightTime!: Moment;

  // ---- teardown refs (written by LifecycleController) ----
  documentCleanups: Cleanup[] = [];
  resizeCleanup: Cleanup | null = null;
  private cleanups: Cleanup[] = [];

  // ---- sub-controllers ----
  calendarController!: CalendarController;
  timePickerController!: TimePickerController;
  rangesController!: RangesController;
  lifecycleController!: LifecycleController;
  inputBinding!: InputBinding;

  constructor(element: HTMLElement, options: DateRangePickerOptions, cb?: PickerCallback) {
    this.element = element;
    INSTANCES.set(element, this);

    this.initDefaults();
    const raw = mergeRawOptions(element, options);

    this.parentEl = resolveParent(raw.parentEl);
    const templateHtml =
      typeof raw.template === "string" ? raw.template : DEFAULT_TEMPLATE;
    this.container = fromHTML(templateHtml);
    this.parentEl.appendChild(this.container);
    this.container.classList.add(this.locale.direction);

    this.calendarController = new CalendarController(this);
    this.timePickerController = new TimePickerController(this);
    this.rangesController = new RangesController(this);
    this.lifecycleController = new LifecycleController(this);
    this.inputBinding = new InputBinding(this);

    applyOptions(this, raw, moment);

    if (typeof cb === "function") {
      this.callback = cb;
    }

    this.finalizeContainerClasses(typeof raw.ranges === "object");
    this.mountRangesList();
    this.applyButtonLabels();
    this.wireEvents();

    if (!this.timePicker) {
      this.startDate = this.startDate.startOf("day");
      this.endDate = this.endDate!.endOf("day");
      this.queryAll(".calendar-time").forEach((el) => {
        el.style.display = "none";
      });
    }

    this.updateElement();
  }

  // ---- construction helpers ----

  private initDefaults(): void {
    this.startDate = moment().startOf("day");
    this.endDate = moment().endOf("day");
    this.minYear = moment().subtract(100, "year").format("YYYY");
    this.maxYear = moment().add(100, "year").format("YYYY");
    this.locale = defaultLocale(moment);

    if (this.element.classList.contains("pull-right")) {
      this.opens = "left";
    }
    if (this.element.classList.contains("dropup")) {
      this.drops = "up";
    }
  }

  private finalizeContainerClasses(rangesProvided: boolean): void {
    if (this.timePicker && this.autoApply) {
      this.autoApply = false;
    }
    if (this.autoApply) {
      this.container.classList.add("auto-apply");
    }
    if (rangesProvided) {
      this.container.classList.add("show-ranges");
    }
    if (this.singleDatePicker) {
      this.container.classList.add("single");
      const left = this.query(".drp-calendar.left");
      const right = this.query(".drp-calendar.right");
      left.classList.add("single");
      left.style.display = "";
      right.style.display = "none";
      if (!this.timePicker && this.autoApply) {
        this.container.classList.add("auto-apply");
      }
    }
    if (
      (!rangesProvided && !this.singleDatePicker) ||
      this.alwaysShowCalendars
    ) {
      this.container.classList.add("show-calendar");
    }
    this.container.classList.add("opens" + this.opens);
  }

  private mountRangesList(): void {
    const html = buildRangesListHtml(
      this.ranges,
      this.locale.customRangeLabel,
      this.showCustomRangeLabel,
    );
    if (!html) {
      return;
    }
    const rangesEl = this.query(".ranges");
    if (rangesEl) {
      rangesEl.insertAdjacentHTML("afterbegin", html);
    }
  }

  private applyButtonLabels(): void {
    const addClasses = (el: HTMLElement, classes: string): void => {
      classes
        .split(/\s+/)
        .filter(Boolean)
        .forEach((c) => {
          el.classList.add(c);
        });
    };
    this.queryAll(".applyBtn, .cancelBtn").forEach((btn) => {
      addClasses(btn, this.buttonClasses);
    });
    if (this.applyButtonClasses.length) {
      addClasses(this.query(".applyBtn"), this.applyButtonClasses);
    }
    if (this.cancelButtonClasses.length) {
      addClasses(this.query(".cancelBtn"), this.cancelButtonClasses);
    }
    this.query(".applyBtn").innerHTML = this.locale.applyLabel;
    this.query(".cancelBtn").innerHTML = this.locale.cancelLabel;
  }

  private wireEvents(): void {
    const calendars = this.queryAll(".drp-calendar");
    for (const cal of calendars) {
      this.cleanups.push(
        delegate(cal, ".prev", "click", (e) => this.clickPrev(e)),
        delegate(cal, ".next", "click", (e) => this.clickNext(e)),
        delegate(cal, "td.available", "mousedown", (e) => this.clickDate(e)),
        delegate(cal, "td.available", "mouseenter", (e) => this.hoverDate(e)),
        delegate(cal, "select.yearselect", "change", (e) =>
          this.monthOrYearChanged(e),
        ),
        delegate(cal, "select.monthselect", "change", (e) =>
          this.monthOrYearChanged(e),
        ),
        delegate(
          cal,
          "select.hourselect, select.minuteselect, select.secondselect, select.ampmselect",
          "change",
          (e) => this.timeChanged(e),
        ),
      );
    }

    const rangesEl = this.query(".ranges");
    if (rangesEl) {
      this.cleanups.push(
        delegate(rangesEl, "li", "click", (e) => this.clickRange(e)),
      );
    }

    const buttonsEl = this.query(".drp-buttons");
    if (buttonsEl) {
      this.cleanups.push(
        delegate(buttonsEl, "button.applyBtn", "click", (e) =>
          this.clickApply(e),
        ),
        delegate(buttonsEl, "button.cancelBtn", "click", (e) =>
          this.clickCancel(e),
        ),
      );
    }

    if (this.element.matches("input") || this.element.matches("button")) {
      this.cleanups.push(
        on(this.element, "click", (e) => this.show(e)),
        on(this.element, "focus", (e) => this.show(e)),
        on(this.element, "keyup", (e) => this.elementChanged(e)),
        on(this.element, "keydown", (e) => this.keydown(e as KeyboardEvent)),
      );
    } else {
      this.cleanups.push(
        on(this.element, "click", (e) => this.toggle(e)),
        on(this.element, "keydown", (e) => this.toggle(e)),
      );
    }
  }

  // ---- internal DOM helpers ----

  query(sel: string): HTMLElement {
    return this.container.querySelector(sel) as HTMLElement;
  }

  queryAll(sel: string): HTMLElement[] {
    return Array.from(this.container.querySelectorAll(sel)) as HTMLElement[];
  }

  // ---- public API ----

  setStartDate(startDate: string | Moment | Date): void {
    if (typeof startDate === "string") {
      this.startDate = moment(startDate, this.locale.format);
    }
    if (
      typeof startDate === "object" &&
      startDate !== null &&
      typeof startDate !== "string"
    ) {
      this.startDate = moment(startDate as Moment | Date);
    }
    if (!this.timePicker) {
      this.startDate = this.startDate.startOf("day");
    }
    if (this.timePicker && this.timePickerIncrement) {
      this.startDate.minute(
        Math.round(this.startDate.minute() / this.timePickerIncrement) *
          this.timePickerIncrement,
      );
    }
    if (this.minDate && this.startDate.isBefore(this.minDate)) {
      this.startDate = this.minDate.clone();
      if (this.timePicker && this.timePickerIncrement) {
        this.startDate.minute(
          Math.round(this.startDate.minute() / this.timePickerIncrement) *
            this.timePickerIncrement,
        );
      }
    }
    if (this.maxDate && this.startDate.isAfter(this.maxDate)) {
      this.startDate = this.maxDate.clone();
      if (this.timePicker && this.timePickerIncrement) {
        this.startDate.minute(
          Math.floor(this.startDate.minute() / this.timePickerIncrement) *
            this.timePickerIncrement,
        );
      }
    }
    if (!this.isShowing) {
      this.updateElement();
    }
    this.updateMonthsInView();
  }

  setEndDate(endDate: string | Moment | Date): void {
    if (typeof endDate === "string") {
      this.endDate = moment(endDate, this.locale.format);
    }
    if (
      typeof endDate === "object" &&
      endDate !== null &&
      typeof endDate !== "string"
    ) {
      this.endDate = moment(endDate as Moment | Date);
    }
    if (!this.timePicker) {
      this.endDate = this.endDate!.endOf("day");
    }
    if (this.timePicker && this.timePickerIncrement) {
      this.endDate!.minute(
        Math.round(this.endDate!.minute() / this.timePickerIncrement) *
          this.timePickerIncrement,
      );
    }
    if (this.endDate!.isBefore(this.startDate)) {
      this.endDate = this.startDate.clone();
    }
    if (this.maxDate && this.endDate!.isAfter(this.maxDate)) {
      this.endDate = this.maxDate.clone();
    }
    if (
      this.maxSpan &&
      this.startDate.clone().add(this.maxSpan).isBefore(this.endDate!)
    ) {
      this.endDate = this.startDate.clone().add(this.maxSpan);
    }
    this.previousRightTime = this.endDate!.clone();

    const sel = this.query(".drp-selected");
    if (sel) {
      sel.innerHTML =
        this.startDate.format(this.locale.format) +
        this.locale.separator +
        this.endDate!.format(this.locale.format);
    }
    if (!this.isShowing) {
      this.updateElement();
    }
    this.updateMonthsInView();
  }

  isInvalidDate(_date: Moment): boolean | string | string[] {
    return false;
  }

  isCustomDate(_date: Moment): boolean | string | string[] {
    return false;
  }

  // ---- delegation: view ----

  updateView(): void {
    this.calendarController.updateView();
  }

  updateMonthsInView(): void {
    this.calendarController.updateMonthsInView();
  }

  updateCalendars(): void {
    this.calendarController.updateCalendars();
  }

  renderCalendar(side: CalendarSide): void {
    this.calendarController.renderCalendar(side);
  }

  renderTimePicker(side: CalendarSide): void {
    this.timePickerController.renderTimePicker(side);
  }

  updateFormInputs(): void {
    this.inputBinding.updateFormInputs();
  }

  // ---- delegation: lifecycle ----

  move(): void {
    this.lifecycleController.move();
  }

  show(e?: Event): void {
    this.lifecycleController.show(e);
  }

  hide(e?: Event): void {
    this.lifecycleController.hide(e);
  }

  toggle(e?: Event): void {
    this.lifecycleController.toggle(e);
  }

  outsideClick(e: Event): void {
    this.lifecycleController.outsideClick(e);
  }

  showCalendars(): void {
    this.lifecycleController.showCalendars();
  }

  hideCalendars(): void {
    this.lifecycleController.hideCalendars();
  }

  clickApply(e?: Event): void {
    this.lifecycleController.clickApply(e);
  }

  clickCancel(e?: Event): void {
    this.lifecycleController.clickCancel(e);
  }

  // ---- delegation: ranges ----

  clickRange(e: Event): void {
    this.rangesController.clickRange(e);
  }

  calculateChosenLabel(): void {
    this.rangesController.calculateChosenLabel();
  }

  // ---- delegation: calendar events ----

  clickPrev(e: Event): void {
    this.calendarController.clickPrev(e);
  }

  clickNext(e: Event): void {
    this.calendarController.clickNext(e);
  }

  hoverDate(e: Event): void {
    this.calendarController.hoverDate(e);
  }

  clickDate(e: Event): void {
    this.calendarController.clickDate(e);
  }

  monthOrYearChanged(e: Event): void {
    this.calendarController.monthOrYearChanged(e);
  }

  // ---- delegation: time picker ----

  timeChanged(e: Event): void {
    this.timePickerController.timeChanged(e);
  }

  // ---- delegation: input ----

  elementChanged(e?: Event): void {
    this.inputBinding.elementChanged(e);
  }

  keydown(e: KeyboardEvent): void {
    this.inputBinding.keydown(e);
  }

  updateElement(): void {
    this.inputBinding.updateElement();
  }

  // ---- teardown ----

  remove(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.cleanups.forEach((c) => {
      c();
    });
    this.cleanups = [];
    this.documentCleanups.forEach((c) => {
      c();
    });
    this.documentCleanups = [];
    if (this.resizeCleanup) {
      this.resizeCleanup();
      this.resizeCleanup = null;
    }
    INSTANCES.delete(this.element);
  }
}
