import * as momentNamespace from "moment";
import type { Moment, MomentInput, MomentFormatSpecification } from "moment";
import { deepMerge, readDataAttrs } from "./dom-utils";
import type { DateRangePicker } from "./daterangepicker";
import type { DateRangePickerOptions } from "./types";

// With moduleResolution:bundler, `import *` of a CJS `export =` module loses call signatures.
// This type is used only as the parameter type for functions that receive the moment factory.
type MomentFn = typeof momentNamespace & {
  (inp?: MomentInput, strict?: boolean): Moment;
  (inp?: MomentInput, format?: MomentFormatSpecification, strict?: boolean): Moment;
  (inp?: MomentInput, format?: MomentFormatSpecification, language?: string, strict?: boolean): Moment;
};

/**
 * Merge element data-* attributes with caller options. Data attrs are
 * overridden by explicit options.
 */
export function mergeRawOptions(element: HTMLElement, options: DateRangePickerOptions): DateRangePickerOptions {
  const normalised = typeof options === "object" && options !== null ? options : {};
  return deepMerge({}, readDataAttrs(element), normalised) as DateRangePickerOptions;
}

/**
 * Apply raw options (after {@link mergeRawOptions}) to a freshly-initialised
 * picker instance. Mutates the picker's state fields in place; does not touch
 * the DOM beyond reading data-attributes that were already merged. The picker
 * must already have its `container` and `parentEl` wired.
 */
export function applyOptions(
  picker: DateRangePicker,
  raw: DateRangePickerOptions,
  moment: MomentFn,
): void {
  applyLocaleOverrides(picker, raw);
  applyDateFields(picker, raw, moment);
  clampStartEndToMinMax(picker);
  applyButtonClasses(picker, raw);
  applySimpleFlags(picker, raw);
  applySingleDatePicker(picker, raw);
  applyTimePickerFlags(picker, raw);
  applyFeatureFlags(picker, raw);
  rotateDaysOfWeek(picker);
  readInitialValueFromTextInput(picker, moment);
  applyRanges(picker, raw, moment);
}

function applyLocaleOverrides(picker: DateRangePicker, raw: DateRangePickerOptions): void {
  if (typeof raw.locale !== "object") {
    return;
  }
  const l = raw.locale;
  if (typeof l.direction === "string") {
    picker.locale.direction = l.direction;
  }
  if (typeof l.format === "string") {
    picker.locale.format = l.format;
  }
  if (typeof l.separator === "string") {
    picker.locale.separator = l.separator;
  }
  if (Array.isArray(l.daysOfWeek)) {
    picker.locale.daysOfWeek = l.daysOfWeek.slice();
  }
  if (Array.isArray(l.monthNames)) {
    picker.locale.monthNames = l.monthNames.slice();
  }
  if (typeof l.firstDay === "number") {
    picker.locale.firstDay = l.firstDay;
  }
  if (typeof l.applyLabel === "string") {
    picker.locale.applyLabel = l.applyLabel;
  }
  if (typeof l.cancelLabel === "string") {
    picker.locale.cancelLabel = l.cancelLabel;
  }
  if (typeof l.weekLabel === "string") {
    picker.locale.weekLabel = l.weekLabel;
  }
  if (typeof l.customRangeLabel === "string") {
    const elem = document.createElement("textarea");
    elem.innerHTML = l.customRangeLabel;
    picker.locale.customRangeLabel = elem.value;
  }
}

function applyDateFields(picker: DateRangePicker, raw: DateRangePickerOptions, moment: MomentFn): void {
  if (typeof raw.startDate === "string") {
    picker.startDate = moment(raw.startDate, picker.locale.format);
  }
  if (typeof raw.endDate === "string") {
    picker.endDate = moment(raw.endDate, picker.locale.format);
  }
  if (typeof raw.minDate === "string") {
    picker.minDate = moment(raw.minDate, picker.locale.format);
  }
  if (typeof raw.maxDate === "string") {
    picker.maxDate = moment(raw.maxDate, picker.locale.format);
  }
  if (isObjectNonString(raw.startDate)) {
    picker.startDate = moment(raw.startDate as Moment | Date);
  }
  if (isObjectNonString(raw.endDate)) {
    picker.endDate = moment(raw.endDate as Moment | Date);
  }
  if (isObjectNonString(raw.minDate)) {
    picker.minDate = moment(raw.minDate as Moment | Date);
  }
  if (isObjectNonString(raw.maxDate)) {
    picker.maxDate = moment(raw.maxDate as Moment | Date);
  }
}

function isObjectNonString(value: unknown): boolean {
  return typeof value === "object" && value !== null && typeof value !== "string";
}

function clampStartEndToMinMax(picker: DateRangePicker): void {
  if (picker.minDate && picker.startDate.isBefore(picker.minDate)) {
    picker.startDate = picker.minDate.clone();
  }
  if (picker.maxDate && picker.endDate!.isAfter(picker.maxDate)) {
    picker.endDate = picker.maxDate.clone();
  }
}

function applyButtonClasses(picker: DateRangePicker, raw: DateRangePickerOptions): void {
  if (typeof raw.applyButtonClasses === "string") {
    picker.applyButtonClasses = raw.applyButtonClasses;
  }
  if (typeof raw.applyClass === "string") {
    picker.applyButtonClasses = raw.applyClass;
  }
  if (typeof raw.cancelButtonClasses === "string") {
    picker.cancelButtonClasses = raw.cancelButtonClasses;
  }
  if (typeof raw.cancelClass === "string") {
    picker.cancelButtonClasses = raw.cancelClass;
  }
  if (typeof raw.buttonClasses === "string") {
    picker.buttonClasses = raw.buttonClasses;
  }
  if (Array.isArray(raw.buttonClasses)) {
    picker.buttonClasses = raw.buttonClasses.join(" ");
  }
}

function applySimpleFlags(picker: DateRangePicker, raw: DateRangePickerOptions): void {
  if (typeof raw.maxSpan === "object" && raw.maxSpan !== null) {
    picker.maxSpan = raw.maxSpan;
  }
  if (typeof raw.dateLimit === "object" && raw.dateLimit !== null) {
    picker.maxSpan = raw.dateLimit;
  }
  if (typeof raw.opens === "string") {
    picker.opens = raw.opens;
  }
  if (typeof raw.drops === "string") {
    picker.drops = raw.drops;
  }
  if (typeof raw.showWeekNumbers === "boolean") {
    picker.showWeekNumbers = raw.showWeekNumbers;
  }
  if (typeof raw.showISOWeekNumbers === "boolean") {
    picker.showISOWeekNumbers = raw.showISOWeekNumbers;
  }
  if (typeof raw.showDropdowns === "boolean") {
    picker.showDropdowns = raw.showDropdowns;
  }
  if (typeof raw.minYear === "number") {
    picker.minYear = raw.minYear;
  }
  if (typeof raw.maxYear === "number") {
    picker.maxYear = raw.maxYear;
  }
  if (typeof raw.showCustomRangeLabel === "boolean") {
    picker.showCustomRangeLabel = raw.showCustomRangeLabel;
  }
}

function applySingleDatePicker(picker: DateRangePicker, raw: DateRangePickerOptions): void {
  if (typeof raw.singleDatePicker === "boolean") {
    picker.singleDatePicker = raw.singleDatePicker;
    if (picker.singleDatePicker) {
      picker.endDate = picker.startDate.clone();
    }
  }
}

function applyTimePickerFlags(picker: DateRangePicker, raw: DateRangePickerOptions): void {
  if (typeof raw.timePicker === "boolean") {
    picker.timePicker = raw.timePicker;
  }
  if (typeof raw.timePickerSeconds === "boolean") {
    picker.timePickerSeconds = raw.timePickerSeconds;
  }
  if (typeof raw.timePickerIncrement === "number") {
    picker.timePickerIncrement = raw.timePickerIncrement;
  }
  if (typeof raw.timePicker24Hour === "boolean") {
    picker.timePicker24Hour = raw.timePicker24Hour;
  }
}

function applyFeatureFlags(picker: DateRangePicker, raw: DateRangePickerOptions): void {
  if (typeof raw.autoApply === "boolean") {
    picker.autoApply = raw.autoApply;
  }
  if (typeof raw.autoUpdateInput === "boolean") {
    picker.autoUpdateInput = raw.autoUpdateInput;
  }
  if (typeof raw.linkedCalendars === "boolean") {
    picker.linkedCalendars = raw.linkedCalendars;
  }
  if (typeof raw.isInvalidDate === "function") {
    picker.isInvalidDate = raw.isInvalidDate;
  }
  if (typeof raw.isCustomDate === "function") {
    picker.isCustomDate = raw.isCustomDate;
  }
  if (typeof raw.alwaysShowCalendars === "boolean") {
    picker.alwaysShowCalendars = raw.alwaysShowCalendars;
  }
}

function rotateDaysOfWeek(picker: DateRangePicker): void {
  if (picker.locale.firstDay === 0) {
    return;
  }
  let iterator = picker.locale.firstDay;
  while (iterator > 0) {
    picker.locale.daysOfWeek.push(picker.locale.daysOfWeek.shift() as string);
    iterator--;
  }
}

function readInitialValueFromTextInput(
  picker: DateRangePicker,
  moment: MomentFn,
): void {
  // `setStartDate`/`setEndDate` are only invoked when both fields were left
  // undefined by the caller — the standard "auto-parse the input" pattern.
  if (!(picker.element instanceof HTMLInputElement)) {
    return;
  }
  const type = picker.element.type;
  if (type !== "" && type !== "text") {
    return;
  }
  const val = picker.element.value;
  const split = val.split(picker.locale.separator);
  let s: Moment | null = null;
  let e: Moment | null = null;
  if (split.length === 2) {
    s = moment(split[0], picker.locale.format);
    e = moment(split[1], picker.locale.format);
  } else if (picker.singleDatePicker && val !== "") {
    s = moment(val, picker.locale.format);
    e = moment(val, picker.locale.format);
  }
  if (s !== null && e !== null) {
    picker.setStartDate(s);
    picker.setEndDate(e);
  }
}

function applyRanges(picker: DateRangePicker, raw: DateRangePickerOptions, moment: MomentFn): void {
  if (typeof raw.ranges !== "object") {
    return;
  }
  for (const range of Object.keys(raw.ranges)) {
    let s: Moment =
      typeof raw.ranges[range][0] === "string"
        ? moment(raw.ranges[range][0] as string, picker.locale.format)
        : moment(raw.ranges[range][0] as Moment | Date);
    let e: Moment =
      typeof raw.ranges[range][1] === "string"
        ? moment(raw.ranges[range][1] as string, picker.locale.format)
        : moment(raw.ranges[range][1] as Moment | Date);

    if (picker.minDate && s.isBefore(picker.minDate)) {
      s = picker.minDate.clone();
    }
    let maxDate: Moment | false = picker.maxDate;
    if (
      picker.maxSpan &&
      maxDate &&
      s.clone().add(picker.maxSpan).isAfter(maxDate)
    ) {
      maxDate = s.clone().add(picker.maxSpan);
    }
    if (maxDate && e.isAfter(maxDate)) {
      e = maxDate.clone();
    }
    if (
      (picker.minDate &&
        e.isBefore(picker.minDate, picker.timePicker ? "minute" : "day")) ||
      (maxDate && s.isAfter(maxDate, picker.timePicker ? "minute" : "day"))
    ) {
      continue;
    }
    // Support unicode chars in the range names.
    const elem = document.createElement("textarea");
    elem.innerHTML = range;
    picker.ranges[elem.value] = [s, e];
  }
}

/**
 * Render the predefined ranges list as an `<ul>` string. Returns an empty
 * string when no ranges are defined. Used by the picker constructor to seed
 * the `.ranges` container.
 */
export function buildRangesListHtml(
  ranges: Record<string, [Moment, Moment]>,
  customRangeLabel: string,
  showCustomRangeLabel: boolean,
): string {
  if (!ranges || Object.keys(ranges).length === 0) {
    return "";
  }
  let list = "<ul>";
  for (const range of Object.keys(ranges)) {
    list += '<li data-range-key="' + range + '">' + range + "</li>";
  }
  if (showCustomRangeLabel) {
    list +=
      '<li data-range-key="' +
      customRangeLabel +
      '">' +
      customRangeLabel +
      "</li>";
  }
  list += "</ul>";
  return list;
}

/**
 * Resolve the parent element the picker container should be appended to.
 * Accepts an `HTMLElement`, a selector string, or falls back to `<body>`.
 */
export function resolveParent(parentEl: unknown): HTMLElement {
  if (parentEl instanceof HTMLElement) {
    return parentEl;
  }
  if (typeof parentEl === "string") {
    const found = document.querySelector(parentEl) as HTMLElement | null;
    if (found) {
      return found;
    }
  }
  return document.body;
}
