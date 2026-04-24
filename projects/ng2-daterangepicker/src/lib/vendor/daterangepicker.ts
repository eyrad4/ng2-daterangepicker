/**
 * Vendored from https://github.com/dangrossman/daterangepicker (v3.1.0).
 * Original copyright (c) 2012-2019 Dan Grossman, MIT License.
 *
 * Phase 3 rewrite: jQuery removed. The plugin is now a plain TypeScript class
 * with native DOM APIs and CustomEvents. The on-element events keep their
 * upstream names (`apply.daterangepicker`, etc.); the picker instance is
 * delivered via `event.detail.picker` rather than the second handler arg.
 *
 * Static lookup: `DateRangePicker.getInstance(element)`.
 */
import * as momentNamespace from "moment";
import {
  Cleanup,
  delegate,
  deepMerge,
  fromHTML,
  offsetTopLeft,
  on,
  outerHeight,
  outerWidth,
  readDataAttrs,
  trigger,
} from "./dom-utils";

const moment: any = (momentNamespace as any).default ?? momentNamespace;

const INSTANCES = new WeakMap<Element, DateRangePicker>();

const DEFAULT_TEMPLATE =
  '<div class="daterangepicker">' +
  '<div class="ranges"></div>' +
  '<div class="drp-calendar left">' +
  '<div class="calendar-table"></div>' +
  '<div class="calendar-time"></div>' +
  "</div>" +
  '<div class="drp-calendar right">' +
  '<div class="calendar-table"></div>' +
  '<div class="calendar-time"></div>' +
  "</div>" +
  '<div class="drp-buttons">' +
  '<span class="drp-selected"></span>' +
  '<button class="cancelBtn" type="button"></button>' +
  '<button class="applyBtn" disabled="disabled" type="button"></button> ' +
  "</div>" +
  "</div>";

export class DateRangePicker {
  static getInstance(element: Element): DateRangePicker | undefined {
    return INSTANCES.get(element);
  }

  // public state
  element: HTMLElement;
  container!: HTMLElement;
  parentEl!: HTMLElement;
  startDate: any;
  endDate: any;
  minDate: any = false;
  maxDate: any = false;
  maxSpan: any = false;
  autoApply = false;
  singleDatePicker = false;
  showDropdowns = false;
  minYear: any;
  maxYear: any;
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
  ranges: Record<string, any> = {};
  opens: "left" | "right" | "center" = "right";
  drops: "down" | "up" | "auto" = "down";
  buttonClasses = "btn btn-sm";
  applyButtonClasses = "btn-primary";
  cancelButtonClasses = "btn-default";
  locale: any;
  callback: (start: any, end: any, label?: any) => void = () => {
    /* noop */
  };
  isShowing = false;
  leftCalendar: any = {};
  rightCalendar: any = {};
  chosenLabel: any;
  oldStartDate: any;
  oldEndDate: any;
  previousRightTime: any;

  // teardown
  private cleanups: Cleanup[] = [];
  private documentCleanups: Cleanup[] = [];
  private resizeCleanup: Cleanup | null = null;

  constructor(
    element: HTMLElement,
    options: any,
    cb?: (start: any, end: any, label?: any) => void,
  ) {
    this.element = element;
    INSTANCES.set(element, this);

    this.startDate = moment().startOf("day");
    this.endDate = moment().endOf("day");
    this.minYear = moment().subtract(100, "year").format("YYYY");
    this.maxYear = moment().add(100, "year").format("YYYY");

    this.locale = {
      direction: "ltr",
      format: moment.localeData().longDateFormat("L"),
      separator: " - ",
      applyLabel: "Apply",
      cancelLabel: "Cancel",
      weekLabel: "W",
      customRangeLabel: "Custom Range",
      daysOfWeek: moment.weekdaysMin(),
      monthNames: moment.monthsShort(),
      firstDay: moment.localeData().firstDayOfWeek(),
    };

    if (this.element.classList.contains("pull-right")) {
      this.opens = "left";
    }
    if (this.element.classList.contains("dropup")) {
      this.drops = "up";
    }

    if (typeof options !== "object" || options === null) {
      options = {};
    }

    // data attributes get overridden by explicit options
    options = deepMerge({}, readDataAttrs(this.element), options);

    const templateHtml =
      typeof options.template === "string"
        ? options.template
        : DEFAULT_TEMPLATE;
    this.parentEl = this.resolveParent(options.parentEl);
    this.container = fromHTML(templateHtml);
    this.parentEl.appendChild(this.container);

    if (typeof options.locale === "object") {
      const l = options.locale;
      if (typeof l.direction === "string") {
        this.locale.direction = l.direction;
      }
      if (typeof l.format === "string") {
        this.locale.format = l.format;
      }
      if (typeof l.separator === "string") {
        this.locale.separator = l.separator;
      }
      if (Array.isArray(l.daysOfWeek)) {
        this.locale.daysOfWeek = l.daysOfWeek.slice();
      }
      if (Array.isArray(l.monthNames)) {
        this.locale.monthNames = l.monthNames.slice();
      }
      if (typeof l.firstDay === "number") {
        this.locale.firstDay = l.firstDay;
      }
      if (typeof l.applyLabel === "string") {
        this.locale.applyLabel = l.applyLabel;
      }
      if (typeof l.cancelLabel === "string") {
        this.locale.cancelLabel = l.cancelLabel;
      }
      if (typeof l.weekLabel === "string") {
        this.locale.weekLabel = l.weekLabel;
      }
      if (typeof l.customRangeLabel === "string") {
        // Support unicode chars in the custom range name.
        const elem = document.createElement("textarea");
        elem.innerHTML = l.customRangeLabel;
        this.locale.customRangeLabel = elem.value;
      }
    }
    this.container.classList.add(this.locale.direction);

    if (typeof options.startDate === "string") {
      this.startDate = moment(options.startDate, this.locale.format);
    }
    if (typeof options.endDate === "string") {
      this.endDate = moment(options.endDate, this.locale.format);
    }
    if (typeof options.minDate === "string") {
      this.minDate = moment(options.minDate, this.locale.format);
    }
    if (typeof options.maxDate === "string") {
      this.maxDate = moment(options.maxDate, this.locale.format);
    }
    if (
      typeof options.startDate === "object" &&
      options.startDate !== null &&
      typeof options.startDate !== "string"
    ) {
      this.startDate = moment(options.startDate);
    }
    if (
      typeof options.endDate === "object" &&
      options.endDate !== null &&
      typeof options.endDate !== "string"
    ) {
      this.endDate = moment(options.endDate);
    }
    if (
      typeof options.minDate === "object" &&
      options.minDate !== null &&
      typeof options.minDate !== "string"
    ) {
      this.minDate = moment(options.minDate);
    }
    if (
      typeof options.maxDate === "object" &&
      options.maxDate !== null &&
      typeof options.maxDate !== "string"
    ) {
      this.maxDate = moment(options.maxDate);
    }

    if (this.minDate && this.startDate.isBefore(this.minDate)) {
      this.startDate = this.minDate.clone();
    }
    if (this.maxDate && this.endDate.isAfter(this.maxDate)) {
      this.endDate = this.maxDate.clone();
    }

    if (typeof options.applyButtonClasses === "string") {
      this.applyButtonClasses = options.applyButtonClasses;
    }
    if (typeof options.applyClass === "string") {
      this.applyButtonClasses = options.applyClass;
    }
    if (typeof options.cancelButtonClasses === "string") {
      this.cancelButtonClasses = options.cancelButtonClasses;
    }
    if (typeof options.cancelClass === "string") {
      this.cancelButtonClasses = options.cancelClass;
    }
    if (typeof options.maxSpan === "object") {
      this.maxSpan = options.maxSpan;
    }
    if (typeof options.dateLimit === "object") {
      this.maxSpan = options.dateLimit;
    }
    if (typeof options.opens === "string") {
      this.opens = options.opens;
    }
    if (typeof options.drops === "string") {
      this.drops = options.drops;
    }
    if (typeof options.showWeekNumbers === "boolean") {
      this.showWeekNumbers = options.showWeekNumbers;
    }
    if (typeof options.showISOWeekNumbers === "boolean") {
      this.showISOWeekNumbers = options.showISOWeekNumbers;
    }
    if (typeof options.buttonClasses === "string") {
      this.buttonClasses = options.buttonClasses;
    }
    if (Array.isArray(options.buttonClasses)) {
      this.buttonClasses = options.buttonClasses.join(" ");
    }
    if (typeof options.showDropdowns === "boolean") {
      this.showDropdowns = options.showDropdowns;
    }
    if (typeof options.minYear === "number") {
      this.minYear = options.minYear;
    }
    if (typeof options.maxYear === "number") {
      this.maxYear = options.maxYear;
    }
    if (typeof options.showCustomRangeLabel === "boolean") {
      this.showCustomRangeLabel = options.showCustomRangeLabel;
    }
    if (typeof options.singleDatePicker === "boolean") {
      this.singleDatePicker = options.singleDatePicker;
      if (this.singleDatePicker) {
        this.endDate = this.startDate.clone();
      }
    }
    if (typeof options.timePicker === "boolean") {
      this.timePicker = options.timePicker;
    }
    if (typeof options.timePickerSeconds === "boolean") {
      this.timePickerSeconds = options.timePickerSeconds;
    }
    if (typeof options.timePickerIncrement === "number") {
      this.timePickerIncrement = options.timePickerIncrement;
    }
    if (typeof options.timePicker24Hour === "boolean") {
      this.timePicker24Hour = options.timePicker24Hour;
    }
    if (typeof options.autoApply === "boolean") {
      this.autoApply = options.autoApply;
    }
    if (typeof options.autoUpdateInput === "boolean") {
      this.autoUpdateInput = options.autoUpdateInput;
    }
    if (typeof options.linkedCalendars === "boolean") {
      this.linkedCalendars = options.linkedCalendars;
    }
    if (typeof options.isInvalidDate === "function") {
      this.isInvalidDate = options.isInvalidDate;
    }
    if (typeof options.isCustomDate === "function") {
      this.isCustomDate = options.isCustomDate;
    }
    if (typeof options.alwaysShowCalendars === "boolean") {
      this.alwaysShowCalendars = options.alwaysShowCalendars;
    }

    // Update day-name order to firstDay
    if (this.locale.firstDay !== 0) {
      let iterator = this.locale.firstDay;
      while (iterator > 0) {
        this.locale.daysOfWeek.push(this.locale.daysOfWeek.shift());
        iterator--;
      }
    }

    // Read initial value from a text input if no start/end provided
    if (
      typeof options.startDate === "undefined" &&
      typeof options.endDate === "undefined" &&
      this.elementIsTextInput()
    ) {
      const val = (this.element as HTMLInputElement).value;
      const split = val.split(this.locale.separator);
      let s: any = null;
      let e: any = null;
      if (split.length === 2) {
        s = moment(split[0], this.locale.format);
        e = moment(split[1], this.locale.format);
      } else if (this.singleDatePicker && val !== "") {
        s = moment(val, this.locale.format);
        e = moment(val, this.locale.format);
      }
      if (s !== null && e !== null) {
        this.setStartDate(s);
        this.setEndDate(e);
      }
    }

    if (typeof options.ranges === "object") {
      for (const range of Object.keys(options.ranges)) {
        let s: any;
        let e: any;
        if (typeof options.ranges[range][0] === "string") {
          s = moment(options.ranges[range][0], this.locale.format);
        } else {
          s = moment(options.ranges[range][0]);
        }
        if (typeof options.ranges[range][1] === "string") {
          e = moment(options.ranges[range][1], this.locale.format);
        } else {
          e = moment(options.ranges[range][1]);
        }
        if (this.minDate && s.isBefore(this.minDate)) {
          s = this.minDate.clone();
        }
        let maxDate = this.maxDate;
        if (
          this.maxSpan &&
          maxDate &&
          s.clone().add(this.maxSpan).isAfter(maxDate)
        ) {
          maxDate = s.clone().add(this.maxSpan);
        }
        if (maxDate && e.isAfter(maxDate)) {
          e = maxDate.clone();
        }
        if (
          (this.minDate &&
            e.isBefore(this.minDate, this.timePicker ? "minute" : "day")) ||
          (maxDate && s.isAfter(maxDate, this.timePicker ? "minute" : "day"))
        ) {
          continue;
        }
        // Support unicode chars in the range names.
        const elem = document.createElement("textarea");
        elem.innerHTML = range;
        this.ranges[elem.value] = [s, e];
      }

      let list = "<ul>";
      for (const range of Object.keys(this.ranges)) {
        list += '<li data-range-key="' + range + '">' + range + "</li>";
      }
      if (this.showCustomRangeLabel) {
        list +=
          '<li data-range-key="' +
          this.locale.customRangeLabel +
          '">' +
          this.locale.customRangeLabel +
          "</li>";
      }
      list += "</ul>";
      const rangesEl = this.container.querySelector(".ranges") as HTMLElement;
      rangesEl.insertAdjacentHTML("afterbegin", list);
    }

    if (typeof cb === "function") {
      this.callback = cb;
    }

    if (!this.timePicker) {
      this.startDate = this.startDate.startOf("day");
      this.endDate = this.endDate.endOf("day");
      this.queryAll(".calendar-time").forEach((el) => {
        (el as HTMLElement).style.display = "none";
      });
    }

    if (this.timePicker && this.autoApply) {
      this.autoApply = false;
    }
    if (this.autoApply) {
      this.container.classList.add("auto-apply");
    }
    if (typeof options.ranges === "object") {
      this.container.classList.add("show-ranges");
    }
    if (this.singleDatePicker) {
      this.container.classList.add("single");
      const left = this.container.querySelector(
        ".drp-calendar.left",
      ) as HTMLElement;
      const right = this.container.querySelector(
        ".drp-calendar.right",
      ) as HTMLElement;
      left.classList.add("single");
      left.style.display = "";
      right.style.display = "none";
      if (!this.timePicker && this.autoApply) {
        this.container.classList.add("auto-apply");
      }
    }
    if (
      (typeof options.ranges === "undefined" && !this.singleDatePicker) ||
      this.alwaysShowCalendars
    ) {
      this.container.classList.add("show-calendar");
    }
    this.container.classList.add("opens" + this.opens);

    // Apply CSS classes and labels to buttons
    this.queryAll(".applyBtn, .cancelBtn").forEach((btn) => {
      this.buttonClasses
        .split(/\s+/)
        .filter(Boolean)
        .forEach((c) => {
          btn.classList.add(c);
        });
    });
    if (this.applyButtonClasses.length) {
      this.applyButtonClasses
        .split(/\s+/)
        .filter(Boolean)
        .forEach((c) => {
          this.query(".applyBtn").classList.add(c);
        });
    }
    if (this.cancelButtonClasses.length) {
      this.cancelButtonClasses
        .split(/\s+/)
        .filter(Boolean)
        .forEach((c) => {
          this.query(".cancelBtn").classList.add(c);
        });
    }
    this.query(".applyBtn").innerHTML = this.locale.applyLabel;
    this.query(".cancelBtn").innerHTML = this.locale.cancelLabel;

    // Event listeners (delegated, scoped to container)
    const calendars = this.query(".drp-calendar")
      ? this.queryAll(".drp-calendar")
      : [];
    calendars.forEach((cal) => {
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
    });

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
        on(this.element, "keydown", (e) => this.keydown(e)),
      );
    } else {
      this.cleanups.push(
        on(this.element, "click", (e) => this.toggle(e)),
        on(this.element, "keydown", (e) => this.toggle(e)),
      );
    }

    // If attached to a text input, set the initial value
    this.updateElement();
  }

  // ---- helpers ----

  private query(sel: string): HTMLElement {
    return this.container.querySelector(sel) as HTMLElement;
  }

  private queryAll(sel: string): HTMLElement[] {
    return Array.from(this.container.querySelectorAll(sel)) as HTMLElement[];
  }

  private elementIsTextInput(): boolean {
    if (!(this.element instanceof HTMLInputElement)) {
      return false;
    }
    const t = (this.element as HTMLInputElement).type;
    return t === "" || t === "text";
  }

  private resolveParent(parentEl: any): HTMLElement {
    if (parentEl) {
      if (parentEl instanceof HTMLElement) {
        return parentEl;
      }
      if (typeof parentEl === "string") {
        const found = document.querySelector(parentEl) as HTMLElement | null;
        if (found) {
          return found;
        }
      }
    }
    return document.body;
  }

  // ---- public API ----

  setStartDate(startDate: any): void {
    if (typeof startDate === "string") {
      this.startDate = moment(startDate, this.locale.format);
    }
    if (
      typeof startDate === "object" &&
      startDate !== null &&
      typeof startDate !== "string"
    ) {
      this.startDate = moment(startDate);
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

  setEndDate(endDate: any): void {
    if (typeof endDate === "string") {
      this.endDate = moment(endDate, this.locale.format);
    }
    if (
      typeof endDate === "object" &&
      endDate !== null &&
      typeof endDate !== "string"
    ) {
      this.endDate = moment(endDate);
    }
    if (!this.timePicker) {
      this.endDate = this.endDate.endOf("day");
    }
    if (this.timePicker && this.timePickerIncrement) {
      this.endDate.minute(
        Math.round(this.endDate.minute() / this.timePickerIncrement) *
          this.timePickerIncrement,
      );
    }
    if (this.endDate.isBefore(this.startDate)) {
      this.endDate = this.startDate.clone();
    }
    if (this.maxDate && this.endDate.isAfter(this.maxDate)) {
      this.endDate = this.maxDate.clone();
    }
    if (
      this.maxSpan &&
      this.startDate.clone().add(this.maxSpan).isBefore(this.endDate)
    ) {
      this.endDate = this.startDate.clone().add(this.maxSpan);
    }
    this.previousRightTime = this.endDate.clone();

    const sel = this.query(".drp-selected");
    if (sel) {
      sel.innerHTML =
        this.startDate.format(this.locale.format) +
        this.locale.separator +
        this.endDate.format(this.locale.format);
    }
    if (!this.isShowing) {
      this.updateElement();
    }
    this.updateMonthsInView();
  }

  isInvalidDate(_date: any): boolean | string | string[] {
    return false;
  }

  isCustomDate(_date: any): boolean | string | string[] {
    return false;
  }

  updateView(): void {
    if (this.timePicker) {
      this.renderTimePicker("left");
      this.renderTimePicker("right");
      const rightSelects = this.queryAll(".right .calendar-time select");
      rightSelects.forEach((s) => {
        (s as HTMLSelectElement).disabled = !this.endDate;
        s.classList.toggle("disabled", !this.endDate);
      });
    }
    if (this.endDate) {
      const sel = this.query(".drp-selected");
      if (sel) {
        sel.innerHTML =
          this.startDate.format(this.locale.format) +
          this.locale.separator +
          this.endDate.format(this.locale.format);
      }
    }
    this.updateMonthsInView();
    this.updateCalendars();
    this.updateFormInputs();
  }

  updateMonthsInView(): void {
    if (this.endDate) {
      if (
        !this.singleDatePicker &&
        this.leftCalendar.month &&
        this.rightCalendar.month &&
        (this.startDate.format("YYYY-MM") ===
          this.leftCalendar.month.format("YYYY-MM") ||
          this.startDate.format("YYYY-MM") ===
            this.rightCalendar.month.format("YYYY-MM")) &&
        (this.endDate.format("YYYY-MM") ===
          this.leftCalendar.month.format("YYYY-MM") ||
          this.endDate.format("YYYY-MM") ===
            this.rightCalendar.month.format("YYYY-MM"))
      ) {
        return;
      }
      this.leftCalendar.month = this.startDate.clone().date(2);
      if (
        !this.linkedCalendars &&
        (this.endDate.month() !== this.startDate.month() ||
          this.endDate.year() !== this.startDate.year())
      ) {
        this.rightCalendar.month = this.endDate.clone().date(2);
      } else {
        this.rightCalendar.month = this.startDate
          .clone()
          .date(2)
          .add(1, "month");
      }
    } else {
      if (
        this.leftCalendar.month.format("YYYY-MM") !==
          this.startDate.format("YYYY-MM") &&
        this.rightCalendar.month.format("YYYY-MM") !==
          this.startDate.format("YYYY-MM")
      ) {
        this.leftCalendar.month = this.startDate.clone().date(2);
        this.rightCalendar.month = this.startDate
          .clone()
          .date(2)
          .add(1, "month");
      }
    }
    if (
      this.maxDate &&
      this.linkedCalendars &&
      !this.singleDatePicker &&
      this.rightCalendar.month > this.maxDate
    ) {
      this.rightCalendar.month = this.maxDate.clone().date(2);
      this.leftCalendar.month = this.maxDate
        .clone()
        .date(2)
        .subtract(1, "month");
    }
  }

  updateCalendars(): void {
    if (this.timePicker) {
      let hour: number;
      let minute: number;
      let second: number;
      const side = this.endDate ? "left" : "right";
      const root = this.query("." + side);
      hour = parseInt(
        (root.querySelector(".hourselect") as HTMLSelectElement).value,
        10,
      );
      minute = parseInt(
        (root.querySelector(".minuteselect") as HTMLSelectElement).value,
        10,
      );
      if (isNaN(minute)) {
        const opts = root.querySelectorAll(".minuteselect option");
        minute = parseInt(
          (opts[opts.length - 1] as HTMLOptionElement).value,
          10,
        );
      }
      second = this.timePickerSeconds
        ? parseInt(
            (root.querySelector(".secondselect") as HTMLSelectElement).value,
            10,
          )
        : 0;
      if (!this.timePicker24Hour) {
        const ampm = (root.querySelector(".ampmselect") as HTMLSelectElement)
          .value;
        if (ampm === "PM" && hour < 12) {
          hour += 12;
        }
        if (ampm === "AM" && hour === 12) {
          hour = 0;
        }
      }
      this.leftCalendar.month.hour(hour).minute(minute).second(second);
      this.rightCalendar.month.hour(hour).minute(minute).second(second);
    }

    this.renderCalendar("left");
    this.renderCalendar("right");

    this.queryAll(".ranges li").forEach((li) => {
      li.classList.remove("active");
    });
    if (this.endDate == null) {
      return;
    }
    this.calculateChosenLabel();
  }

  renderCalendar(side: "left" | "right"): void {
    const calMeta = side === "left" ? this.leftCalendar : this.rightCalendar;
    const month = calMeta.month.month();
    const year = calMeta.month.year();
    const hour = calMeta.month.hour();
    const minute = calMeta.month.minute();
    const second = calMeta.month.second();
    const daysInMonth = moment([year, month]).daysInMonth();
    const firstDay = moment([year, month, 1]);
    const lastDay = moment([year, month, daysInMonth]);
    const lastMonth = moment(firstDay).subtract(1, "month").month();
    const lastYear = moment(firstDay).subtract(1, "month").year();
    const daysInLastMonth = moment([lastYear, lastMonth]).daysInMonth();
    const dayOfWeek = firstDay.day();

    const calendar: any = [];
    calendar.firstDay = firstDay;
    calendar.lastDay = lastDay;

    for (let i = 0; i < 6; i++) {
      calendar[i] = [];
    }

    let startDay = daysInLastMonth - dayOfWeek + this.locale.firstDay + 1;
    if (startDay > daysInLastMonth) {
      startDay -= 7;
    }
    if (dayOfWeek === this.locale.firstDay) {
      startDay = daysInLastMonth - 6;
    }

    let curDate = moment([lastYear, lastMonth, startDay, 12, minute, second]);

    for (
      let i = 0, col = 0, row = 0;
      i < 42;
      i++, col++, curDate = moment(curDate).add(24, "hour")
    ) {
      if (i > 0 && col % 7 === 0) {
        col = 0;
        row++;
      }
      calendar[row][col] = curDate
        .clone()
        .hour(hour)
        .minute(minute)
        .second(second);
      curDate.hour(12);

      if (
        this.minDate &&
        calendar[row][col].format("YYYY-MM-DD") ===
          this.minDate.format("YYYY-MM-DD") &&
        calendar[row][col].isBefore(this.minDate) &&
        side === "left"
      ) {
        calendar[row][col] = this.minDate.clone();
      }
      if (
        this.maxDate &&
        calendar[row][col].format("YYYY-MM-DD") ===
          this.maxDate.format("YYYY-MM-DD") &&
        calendar[row][col].isAfter(this.maxDate) &&
        side === "right"
      ) {
        calendar[row][col] = this.maxDate.clone();
      }
    }

    if (side === "left") {
      this.leftCalendar.calendar = calendar;
    } else {
      this.rightCalendar.calendar = calendar;
    }

    const minDate = side === "left" ? this.minDate : this.startDate;
    let maxDate = this.maxDate;
    const _selected = side === "left" ? this.startDate : this.endDate;

    let html = '<table class="table-condensed">';
    html += "<thead>";
    html += "<tr>";

    if (this.showWeekNumbers || this.showISOWeekNumbers) {
      html += "<th></th>";
    }
    if (
      (!minDate || minDate.isBefore(calendar.firstDay)) &&
      (!this.linkedCalendars || side === "left")
    ) {
      html += '<th class="prev available"><span></span></th>';
    } else {
      html += "<th></th>";
    }

    let dateHtml =
      this.locale.monthNames[calendar[1][1].month()] +
      calendar[1][1].format(" YYYY");

    if (this.showDropdowns) {
      const currentMonth = calendar[1][1].month();
      const currentYear = calendar[1][1].year();
      const maxYear = (maxDate && maxDate.year()) || this.maxYear;
      const minYear = (minDate && minDate.year()) || this.minYear;
      const inMinYear = currentYear === minYear;
      const inMaxYear = currentYear === maxYear;

      let monthHtml = '<select class="monthselect">';
      for (let m = 0; m < 12; m++) {
        if (
          (!inMinYear || (minDate && m >= minDate.month())) &&
          (!inMaxYear || (maxDate && m <= maxDate.month()))
        ) {
          monthHtml +=
            "<option value='" +
            m +
            "'" +
            (m === currentMonth ? " selected='selected'" : "") +
            ">" +
            this.locale.monthNames[m] +
            "</option>";
        } else {
          monthHtml +=
            "<option value='" +
            m +
            "'" +
            (m === currentMonth ? " selected='selected'" : "") +
            " disabled='disabled'>" +
            this.locale.monthNames[m] +
            "</option>";
        }
      }
      monthHtml += "</select>";

      let yearHtml = '<select class="yearselect">';
      for (let y = minYear; y <= maxYear; y++) {
        yearHtml +=
          '<option value="' +
          y +
          '"' +
          (y === currentYear ? ' selected="selected"' : "") +
          ">" +
          y +
          "</option>";
      }
      yearHtml += "</select>";
      dateHtml = monthHtml + yearHtml;
    }

    html += '<th colspan="5" class="month">' + dateHtml + "</th>";
    if (
      (!maxDate || maxDate.isAfter(calendar.lastDay)) &&
      (!this.linkedCalendars || side === "right" || this.singleDatePicker)
    ) {
      html += '<th class="next available"><span></span></th>';
    } else {
      html += "<th></th>";
    }

    html += "</tr>";
    html += "<tr>";

    if (this.showWeekNumbers || this.showISOWeekNumbers) {
      html += '<th class="week">' + this.locale.weekLabel + "</th>";
    }
    this.locale.daysOfWeek.forEach((dayOfWeekName: string) => {
      html += "<th>" + dayOfWeekName + "</th>";
    });

    html += "</tr>";
    html += "</thead>";
    html += "<tbody>";

    if (this.endDate == null && this.maxSpan) {
      const maxLimit = this.startDate.clone().add(this.maxSpan).endOf("day");
      if (!maxDate || maxLimit.isBefore(maxDate)) {
        maxDate = maxLimit;
      }
    }

    for (let row = 0; row < 6; row++) {
      html += "<tr>";
      if (this.showWeekNumbers) {
        html += '<td class="week">' + calendar[row][0].week() + "</td>";
      } else if (this.showISOWeekNumbers) {
        html += '<td class="week">' + calendar[row][0].isoWeek() + "</td>";
      }
      for (let col = 0; col < 7; col++) {
        const classes: string[] = [];
        if (calendar[row][col].isSame(new Date(), "day")) {
          classes.push("today");
        }
        if (calendar[row][col].isoWeekday() > 5) {
          classes.push("weekend");
        }
        if (calendar[row][col].month() !== calendar[1][1].month()) {
          classes.push("off", "ends");
        }
        if (this.minDate && calendar[row][col].isBefore(this.minDate, "day")) {
          classes.push("off", "disabled");
        }
        if (maxDate && calendar[row][col].isAfter(maxDate, "day")) {
          classes.push("off", "disabled");
        }
        if (this.isInvalidDate(calendar[row][col])) {
          classes.push("off", "disabled");
        }
        if (
          calendar[row][col].format("YYYY-MM-DD") ===
          this.startDate.format("YYYY-MM-DD")
        ) {
          classes.push("active", "start-date");
        }
        if (
          this.endDate != null &&
          calendar[row][col].format("YYYY-MM-DD") ===
            this.endDate.format("YYYY-MM-DD")
        ) {
          classes.push("active", "end-date");
        }
        if (
          this.endDate != null &&
          calendar[row][col] > this.startDate &&
          calendar[row][col] < this.endDate
        ) {
          classes.push("in-range");
        }
        const isCustom = this.isCustomDate(calendar[row][col]);
        if (isCustom !== false) {
          if (typeof isCustom === "string") {
            classes.push(isCustom);
          } else {
            Array.prototype.push.apply(classes, isCustom as string[]);
          }
        }
        let cname = "";
        let disabled = false;
        for (let i = 0; i < classes.length; i++) {
          cname += classes[i] + " ";
          if (classes[i] === "disabled") {
            disabled = true;
          }
        }
        if (!disabled) {
          cname += "available";
        }
        html +=
          '<td class="' +
          cname.replace(/^\s+|\s+$/g, "") +
          '" data-title="r' +
          row +
          "c" +
          col +
          '">' +
          calendar[row][col].date() +
          "</td>";
      }
      html += "</tr>";
    }
    html += "</tbody>";
    html += "</table>";

    const target = this.query(".drp-calendar." + side + " .calendar-table");
    if (target) {
      target.innerHTML = html;
    }
  }

  renderTimePicker(side: "left" | "right"): void {
    if (side === "right" && !this.endDate) {
      return;
    }

    let selected: any;
    let minDate: any;
    let maxDate: any = this.maxDate;

    if (
      this.maxSpan &&
      (!this.maxDate ||
        this.startDate.clone().add(this.maxSpan).isBefore(this.maxDate))
    ) {
      maxDate = this.startDate.clone().add(this.maxSpan);
    }

    if (side === "left") {
      selected = this.startDate.clone();
      minDate = this.minDate;
    } else {
      selected = this.endDate.clone();
      minDate = this.startDate;
      const timeSelector = this.query(".drp-calendar.right .calendar-time");
      if (timeSelector && timeSelector.innerHTML !== "") {
        const optVal = (sel: string): string => {
          const el = timeSelector.querySelector(
            sel + " option:checked",
          ) as HTMLOptionElement | null;
          return el ? el.value : "";
        };
        selected.hour(
          !isNaN(selected.hour()) ? selected.hour() : optVal(".hourselect"),
        );
        selected.minute(
          !isNaN(selected.minute())
            ? selected.minute()
            : optVal(".minuteselect"),
        );
        selected.second(
          !isNaN(selected.second())
            ? selected.second()
            : optVal(".secondselect"),
        );
        if (!this.timePicker24Hour) {
          const ampm = optVal(".ampmselect");
          if (ampm === "PM" && selected.hour() < 12) {
            selected.hour(selected.hour() + 12);
          }
          if (ampm === "AM" && selected.hour() === 12) {
            selected.hour(0);
          }
        }
      }
      if (selected.isBefore(this.startDate)) {
        selected = this.startDate.clone();
      }
      if (maxDate && selected.isAfter(maxDate)) {
        selected = maxDate.clone();
      }
    }

    let html = '<select class="hourselect">';
    const start = this.timePicker24Hour ? 0 : 1;
    const end = this.timePicker24Hour ? 23 : 12;
    for (let i = start; i <= end; i++) {
      let i_in_24 = i;
      if (!this.timePicker24Hour) {
        i_in_24 =
          selected.hour() >= 12 ? (i === 12 ? 12 : i + 12) : i === 12 ? 0 : i;
      }
      const time = selected.clone().hour(i_in_24);
      let disabled = false;
      if (minDate && time.minute(59).isBefore(minDate)) {
        disabled = true;
      }
      if (maxDate && time.minute(0).isAfter(maxDate)) {
        disabled = true;
      }
      if (i_in_24 === selected.hour() && !disabled) {
        html +=
          '<option value="' + i + '" selected="selected">' + i + "</option>";
      } else if (disabled) {
        html +=
          '<option value="' +
          i +
          '" disabled="disabled" class="disabled">' +
          i +
          "</option>";
      } else {
        html += '<option value="' + i + '">' + i + "</option>";
      }
    }
    html += "</select> ";

    html += ': <select class="minuteselect">';
    for (let i = 0; i < 60; i += this.timePickerIncrement) {
      const padded = i < 10 ? "0" + i : i;
      const time = selected.clone().minute(i);
      let disabled = false;
      if (minDate && time.second(59).isBefore(minDate)) {
        disabled = true;
      }
      if (maxDate && time.second(0).isAfter(maxDate)) {
        disabled = true;
      }
      if (selected.minute() === i && !disabled) {
        html +=
          '<option value="' +
          i +
          '" selected="selected">' +
          padded +
          "</option>";
      } else if (disabled) {
        html +=
          '<option value="' +
          i +
          '" disabled="disabled" class="disabled">' +
          padded +
          "</option>";
      } else {
        html += '<option value="' + i + '">' + padded + "</option>";
      }
    }
    html += "</select> ";

    if (this.timePickerSeconds) {
      html += ': <select class="secondselect">';
      for (let i = 0; i < 60; i++) {
        const padded = i < 10 ? "0" + i : i;
        const time = selected.clone().second(i);
        let disabled = false;
        if (minDate && time.isBefore(minDate)) {
          disabled = true;
        }
        if (maxDate && time.isAfter(maxDate)) {
          disabled = true;
        }
        if (selected.second() === i && !disabled) {
          html +=
            '<option value="' +
            i +
            '" selected="selected">' +
            padded +
            "</option>";
        } else if (disabled) {
          html +=
            '<option value="' +
            i +
            '" disabled="disabled" class="disabled">' +
            padded +
            "</option>";
        } else {
          html += '<option value="' + i + '">' + padded + "</option>";
        }
      }
      html += "</select> ";
    }

    if (!this.timePicker24Hour) {
      html += '<select class="ampmselect">';
      let am_html = "";
      let pm_html = "";
      if (
        minDate &&
        selected.clone().hour(12).minute(0).second(0).isBefore(minDate)
      ) {
        am_html = ' disabled="disabled" class="disabled"';
      }
      if (
        maxDate &&
        selected.clone().hour(0).minute(0).second(0).isAfter(maxDate)
      ) {
        pm_html = ' disabled="disabled" class="disabled"';
      }
      if (selected.hour() >= 12) {
        html +=
          '<option value="AM"' +
          am_html +
          '>AM</option><option value="PM" selected="selected"' +
          pm_html +
          ">PM</option>";
      } else {
        html +=
          '<option value="AM" selected="selected"' +
          am_html +
          '>AM</option><option value="PM"' +
          pm_html +
          ">PM</option>";
      }
      html += "</select>";
    }

    const target = this.query(".drp-calendar." + side + " .calendar-time");
    if (target) {
      target.innerHTML = html;
    }
  }

  updateFormInputs(): void {
    const applyBtn = this.query("button.applyBtn") as HTMLButtonElement | null;
    if (!applyBtn) {
      return;
    }
    const enabled =
      this.singleDatePicker ||
      (this.endDate &&
        (this.startDate.isBefore(this.endDate) ||
          this.startDate.isSame(this.endDate)));
    applyBtn.disabled = !enabled;
  }

  move(): void {
    let parentOffset = { top: 0, left: 0 };
    let containerTop: number;
    let drops = this.drops;
    let parentRightEdge = window.innerWidth;

    if (this.parentEl !== document.body) {
      const off = offsetTopLeft(this.parentEl);
      parentOffset = {
        top: off.top - this.parentEl.scrollTop,
        left: off.left - this.parentEl.scrollLeft,
      };
      parentRightEdge =
        this.parentEl.clientWidth + offsetTopLeft(this.parentEl).left;
    }

    const elementOff = offsetTopLeft(this.element);
    const elementOuterHeight = outerHeight(this.element);
    const elementOuterWidth = outerWidth(this.element);

    switch (drops) {
      case "auto":
        containerTop = elementOff.top + elementOuterHeight - parentOffset.top;
        if (
          containerTop + outerHeight(this.container) >=
          this.parentEl.scrollHeight
        ) {
          containerTop =
            elementOff.top - outerHeight(this.container) - parentOffset.top;
          drops = "up";
        }
        break;
      case "up":
        containerTop =
          elementOff.top - outerHeight(this.container) - parentOffset.top;
        break;
      default:
        containerTop = elementOff.top + elementOuterHeight - parentOffset.top;
    }

    this.container.style.top = "0";
    this.container.style.left = "0";
    this.container.style.right = "auto";
    const containerWidth = outerWidth(this.container);

    this.container.classList.toggle("drop-up", drops === "up");

    const setCss = (
      top: number | string,
      left: number | string,
      right: number | string,
    ) => {
      this.container.style.top = typeof top === "number" ? top + "px" : top;
      this.container.style.left = typeof left === "number" ? left + "px" : left;
      this.container.style.right =
        typeof right === "number" ? right + "px" : right;
    };

    if (this.opens === "left") {
      const containerRight =
        parentRightEdge - elementOff.left - elementOuterWidth;
      if (containerWidth + containerRight > window.innerWidth) {
        setCss(containerTop, 9, "auto");
      } else {
        setCss(containerTop, "auto", containerRight);
      }
    } else if (this.opens === "center") {
      const containerLeft =
        elementOff.left -
        parentOffset.left +
        elementOuterWidth / 2 -
        containerWidth / 2;
      if (containerLeft < 0) {
        setCss(containerTop, 9, "auto");
      } else if (containerLeft + containerWidth > window.innerWidth) {
        setCss(containerTop, "auto", 0);
      } else {
        setCss(containerTop, containerLeft, "auto");
      }
    } else {
      const containerLeft = elementOff.left - parentOffset.left;
      if (containerLeft + containerWidth > window.innerWidth) {
        setCss(containerTop, "auto", 0);
      } else {
        setCss(containerTop, containerLeft, "auto");
      }
    }
  }

  show(_e?: Event): void {
    if (this.isShowing) {
      return;
    }

    const outsideClickProxy = (e: Event) => this.outsideClick(e);
    this.documentCleanups.push(
      on(document, "mousedown", outsideClickProxy),
      on(document, "touchend", outsideClickProxy),
      on(document, "focusin", outsideClickProxy),
      delegate(
        document.body,
        "[data-toggle=dropdown]",
        "click",
        outsideClickProxy,
      ),
    );
    this.resizeCleanup = on(window, "resize", () => this.move());

    this.oldStartDate = this.startDate.clone();
    this.oldEndDate = this.endDate.clone();
    this.previousRightTime = this.endDate.clone();

    this.updateView();
    this.container.style.display = "block";
    this.move();
    trigger(this.element, "show.daterangepicker", { picker: this });
    this.isShowing = true;
  }

  hide(_e?: Event): void {
    if (!this.isShowing) {
      return;
    }

    if (!this.endDate) {
      this.startDate = this.oldStartDate.clone();
      this.endDate = this.oldEndDate.clone();
    }
    if (
      !this.startDate.isSame(this.oldStartDate) ||
      !this.endDate.isSame(this.oldEndDate)
    ) {
      this.callback(
        this.startDate.clone(),
        this.endDate.clone(),
        this.chosenLabel,
      );
    }
    this.updateElement();

    this.documentCleanups.forEach((c) => {
      c();
    });
    this.documentCleanups = [];
    if (this.resizeCleanup) {
      this.resizeCleanup();
      this.resizeCleanup = null;
    }

    this.container.style.display = "none";
    trigger(this.element, "hide.daterangepicker", { picker: this });
    this.isShowing = false;
  }

  toggle(_e?: Event): void {
    if (this.isShowing) {
      this.hide();
    } else {
      this.show();
    }
  }

  outsideClick(e: Event): void {
    const target = e.target as HTMLElement | null;
    if (!target) {
      return;
    }
    if (
      e.type === "focusin" ||
      target === this.element ||
      this.element.contains(target) ||
      target === this.container ||
      this.container.contains(target) ||
      target.closest(".calendar-table")
    ) {
      return;
    }
    this.hide();
    trigger(this.element, "outsideClick.daterangepicker", { picker: this });
  }

  showCalendars(): void {
    this.container.classList.add("show-calendar");
    this.move();
    trigger(this.element, "showCalendar.daterangepicker", { picker: this });
  }

  hideCalendars(): void {
    this.container.classList.remove("show-calendar");
    trigger(this.element, "hideCalendar.daterangepicker", { picker: this });
  }

  clickRange(e: Event): void {
    const target = e.target as HTMLElement;
    const label = target.getAttribute("data-range-key");
    this.chosenLabel = label;
    if (label === this.locale.customRangeLabel) {
      this.showCalendars();
    } else {
      const dates = this.ranges[label!];
      this.startDate = dates[0];
      this.endDate = dates[1];
      if (!this.timePicker) {
        this.startDate.startOf("day");
        this.endDate.endOf("day");
      }
      if (!this.alwaysShowCalendars) {
        this.hideCalendars();
      }
      this.clickApply();
    }
  }

  clickPrev(e: Event): void {
    const cal = (e.target as HTMLElement).closest(".drp-calendar");
    if (!cal) {
      return;
    }
    if (cal.classList.contains("left")) {
      this.leftCalendar.month.subtract(1, "month");
      if (this.linkedCalendars) {
        this.rightCalendar.month.subtract(1, "month");
      }
    } else {
      this.rightCalendar.month.subtract(1, "month");
    }
    this.updateCalendars();
  }

  clickNext(e: Event): void {
    const cal = (e.target as HTMLElement).closest(".drp-calendar");
    if (!cal) {
      return;
    }
    if (cal.classList.contains("left")) {
      this.leftCalendar.month.add(1, "month");
    } else {
      this.rightCalendar.month.add(1, "month");
      if (this.linkedCalendars) {
        this.leftCalendar.month.add(1, "month");
      }
    }
    this.updateCalendars();
  }

  hoverDate(e: Event): void {
    const target = e.target as HTMLElement;
    if (!target.classList.contains("available")) {
      return;
    }

    const title = target.getAttribute("data-title") || "";
    const row = parseInt(title.substr(1, 1), 10);
    const col = parseInt(title.substr(3, 1), 10);
    const cal = target.closest(".drp-calendar") as HTMLElement | null;
    if (!cal) {
      return;
    }
    const date = cal.classList.contains("left")
      ? this.leftCalendar.calendar[row][col]
      : this.rightCalendar.calendar[row][col];

    const leftCalendar = this.leftCalendar;
    const rightCalendar = this.rightCalendar;
    const startDate = this.startDate;
    if (!this.endDate) {
      this.queryAll(".drp-calendar tbody td").forEach((el) => {
        if (el.classList.contains("week")) {
          return;
        }
        const t = el.getAttribute("data-title") || "";
        const r = parseInt(t.substr(1, 1), 10);
        const c = parseInt(t.substr(3, 1), 10);
        const calEl = el.closest(".drp-calendar");
        if (!calEl) {
          return;
        }
        const dt = calEl.classList.contains("left")
          ? leftCalendar.calendar[r][c]
          : rightCalendar.calendar[r][c];
        if (
          (dt.isAfter(startDate) && dt.isBefore(date)) ||
          dt.isSame(date, "day")
        ) {
          el.classList.add("in-range");
        } else {
          el.classList.remove("in-range");
        }
      });
    }
  }

  clickDate(e: Event): void {
    const target = e.target as HTMLElement;
    if (!target.classList.contains("available")) {
      return;
    }

    const title = target.getAttribute("data-title") || "";
    const row = parseInt(title.substr(1, 1), 10);
    const col = parseInt(title.substr(3, 1), 10);
    const cal = target.closest(".drp-calendar") as HTMLElement | null;
    if (!cal) {
      return;
    }
    let date = cal.classList.contains("left")
      ? this.leftCalendar.calendar[row][col]
      : this.rightCalendar.calendar[row][col];

    if (this.endDate || date.isBefore(this.startDate, "day")) {
      if (this.timePicker) {
        date = date.clone();
        this.applyTimeSelectionsToDate("left", date);
      }
      this.endDate = null;
      this.setStartDate(date.clone ? date.clone() : moment(date));
    } else if (!this.endDate && date.isBefore(this.startDate)) {
      this.setEndDate(this.startDate.clone());
    } else {
      if (this.timePicker) {
        date = date.clone();
        this.applyTimeSelectionsToDate("right", date);
      }
      this.setEndDate(date.clone ? date.clone() : moment(date));
      if (this.autoApply) {
        this.calculateChosenLabel();
        this.clickApply();
      }
    }

    if (this.singleDatePicker) {
      this.setEndDate(this.startDate);
      if (!this.timePicker && this.autoApply) {
        this.clickApply();
      }
    }

    this.updateView();
    e.stopPropagation();
  }

  private applyTimeSelectionsToDate(side: "left" | "right", date: any): void {
    const root = this.query("." + side);
    if (!root) {
      return;
    }
    let hour = parseInt(
      (root.querySelector(".hourselect") as HTMLSelectElement).value,
      10,
    );
    if (!this.timePicker24Hour) {
      const ampm = (root.querySelector(".ampmselect") as HTMLSelectElement)
        .value;
      if (ampm === "PM" && hour < 12) {
        hour += 12;
      }
      if (ampm === "AM" && hour === 12) {
        hour = 0;
      }
    }
    let minute = parseInt(
      (root.querySelector(".minuteselect") as HTMLSelectElement).value,
      10,
    );
    if (isNaN(minute)) {
      const opts = root.querySelectorAll(".minuteselect option");
      minute = parseInt((opts[opts.length - 1] as HTMLOptionElement).value, 10);
    }
    const second = this.timePickerSeconds
      ? parseInt(
          (root.querySelector(".secondselect") as HTMLSelectElement).value,
          10,
        )
      : 0;
    date.hour(hour).minute(minute).second(second);
  }

  calculateChosenLabel(): void {
    let customRange = true;
    let i = 0;
    const items = this.queryAll(".ranges li");
    for (const range of Object.keys(this.ranges)) {
      if (this.timePicker) {
        const format = this.timePickerSeconds
          ? "YYYY-MM-DD HH:mm:ss"
          : "YYYY-MM-DD HH:mm";
        if (
          this.startDate.format(format) ===
            this.ranges[range][0].format(format) &&
          this.endDate.format(format) === this.ranges[range][1].format(format)
        ) {
          customRange = false;
          if (items[i]) {
            items[i].classList.add("active");
            this.chosenLabel = items[i].getAttribute("data-range-key");
          }
          break;
        }
      } else {
        if (
          this.startDate.format("YYYY-MM-DD") ===
            this.ranges[range][0].format("YYYY-MM-DD") &&
          this.endDate.format("YYYY-MM-DD") ===
            this.ranges[range][1].format("YYYY-MM-DD")
        ) {
          customRange = false;
          if (items[i]) {
            items[i].classList.add("active");
            this.chosenLabel = items[i].getAttribute("data-range-key");
          }
          break;
        }
      }
      i++;
    }
    if (customRange) {
      if (this.showCustomRangeLabel) {
        const last = items[items.length - 1];
        if (last) {
          last.classList.add("active");
          this.chosenLabel = last.getAttribute("data-range-key");
        }
      } else {
        this.chosenLabel = null;
      }
      this.showCalendars();
    }
  }

  clickApply(_e?: Event): void {
    this.hide();
    trigger(this.element, "apply.daterangepicker", { picker: this });
  }

  clickCancel(_e?: Event): void {
    this.startDate = this.oldStartDate;
    this.endDate = this.oldEndDate;
    this.hide();
    trigger(this.element, "cancel.daterangepicker", { picker: this });
  }

  monthOrYearChanged(e: Event): void {
    const cal = (e.target as HTMLElement).closest(
      ".drp-calendar",
    ) as HTMLElement | null;
    if (!cal) {
      return;
    }
    const isLeft = cal.classList.contains("left");
    let month = parseInt(
      (cal.querySelector(".monthselect") as HTMLSelectElement).value,
      10,
    );
    let year: any = (cal.querySelector(".yearselect") as HTMLSelectElement)
      .value;

    if (!isLeft) {
      if (
        year < this.startDate.year() ||
        (year === this.startDate.year() && month < this.startDate.month())
      ) {
        month = this.startDate.month();
        year = this.startDate.year();
      }
    }
    if (this.minDate) {
      if (
        year < this.minDate.year() ||
        (year === this.minDate.year() && month < this.minDate.month())
      ) {
        month = this.minDate.month();
        year = this.minDate.year();
      }
    }
    if (this.maxDate) {
      if (
        year > this.maxDate.year() ||
        (year === this.maxDate.year() && month > this.maxDate.month())
      ) {
        month = this.maxDate.month();
        year = this.maxDate.year();
      }
    }

    if (isLeft) {
      this.leftCalendar.month.month(month).year(year);
      if (this.linkedCalendars) {
        this.rightCalendar.month = this.leftCalendar.month
          .clone()
          .add(1, "month");
      }
    } else {
      this.rightCalendar.month.month(month).year(year);
      if (this.linkedCalendars) {
        this.leftCalendar.month = this.rightCalendar.month
          .clone()
          .subtract(1, "month");
      }
    }
    this.updateCalendars();
  }

  timeChanged(e: Event): void {
    const cal = (e.target as HTMLElement).closest(
      ".drp-calendar",
    ) as HTMLElement | null;
    if (!cal) {
      return;
    }
    const isLeft = cal.classList.contains("left");

    let hour = parseInt(
      (cal.querySelector(".hourselect") as HTMLSelectElement).value,
      10,
    );
    let minute = parseInt(
      (cal.querySelector(".minuteselect") as HTMLSelectElement).value,
      10,
    );
    if (isNaN(minute)) {
      const opts = cal.querySelectorAll(".minuteselect option");
      minute = parseInt((opts[opts.length - 1] as HTMLOptionElement).value, 10);
    }
    const second = this.timePickerSeconds
      ? parseInt(
          (cal.querySelector(".secondselect") as HTMLSelectElement).value,
          10,
        )
      : 0;

    if (!this.timePicker24Hour) {
      const ampm = (cal.querySelector(".ampmselect") as HTMLSelectElement)
        .value;
      if (ampm === "PM" && hour < 12) {
        hour += 12;
      }
      if (ampm === "AM" && hour === 12) {
        hour = 0;
      }
    }

    if (isLeft) {
      const start = this.startDate.clone();
      start.hour(hour);
      start.minute(minute);
      start.second(second);
      this.setStartDate(start);
      if (this.singleDatePicker) {
        this.endDate = this.startDate.clone();
      } else if (
        this.endDate &&
        this.endDate.format("YYYY-MM-DD") === start.format("YYYY-MM-DD") &&
        this.endDate.isBefore(start)
      ) {
        this.setEndDate(start.clone());
      }
    } else if (this.endDate) {
      const end = this.endDate.clone();
      end.hour(hour);
      end.minute(minute);
      end.second(second);
      this.setEndDate(end);
    }

    this.updateCalendars();
    this.updateFormInputs();
    this.renderTimePicker("left");
    this.renderTimePicker("right");
  }

  elementChanged(_e?: Event): void {
    if (!(this.element instanceof HTMLInputElement)) {
      return;
    }
    const val = this.element.value;
    if (!val.length) {
      return;
    }

    const dateString = val.split(this.locale.separator);
    let s: any = null;
    let e: any = null;
    if (dateString.length === 2) {
      s = moment(dateString[0], this.locale.format);
      e = moment(dateString[1], this.locale.format);
    }
    if (this.singleDatePicker || s === null || e === null) {
      s = moment(val, this.locale.format);
      e = s;
    }
    if (!s.isValid() || !e.isValid()) {
      return;
    }
    this.setStartDate(s);
    this.setEndDate(e);
    this.updateView();
  }

  keydown(e: KeyboardEvent): void {
    if (e.keyCode === 9 || e.keyCode === 13) {
      this.hide();
    }
    if (e.keyCode === 27) {
      e.preventDefault();
      e.stopPropagation();
      this.hide();
    }
  }

  updateElement(): void {
    if (!(this.element instanceof HTMLInputElement) || !this.autoUpdateInput) {
      return;
    }
    let newValue = this.startDate.format(this.locale.format);
    if (!this.singleDatePicker) {
      newValue +=
        this.locale.separator + this.endDate.format(this.locale.format);
    }
    if (newValue !== this.element.value) {
      this.element.value = newValue;
      trigger(this.element, "change");
    }
  }

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
