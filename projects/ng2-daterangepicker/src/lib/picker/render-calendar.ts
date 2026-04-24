import * as momentNamespace from "moment";
import type { Moment, DurationInputObject, MomentInput } from "moment";
import { buildCalendarMatrix, clampCalendarToMinMax } from "./calendar-math";
import type { CalendarMatrix, CalendarMeta, CalendarSide, Locale } from "./types";

// With moduleResolution:bundler, `import *` of a CJS `export =` module loses call signatures.
type MomentFn = typeof momentNamespace & {
  (inp?: MomentInput, strict?: boolean): Moment;
};

/**
 * Narrow projection of picker state required to render one calendar side.
 * The `DateRangePicker` instance satisfies this interface structurally.
 */
export interface RenderCalendarState {
  startDate: Moment;
  endDate: Moment | null;
  minDate: Moment | false;
  maxDate: Moment | false;
  maxSpan: DurationInputObject | false;
  minYear: number | string;
  maxYear: number | string;
  locale: Locale;
  leftCalendar: CalendarMeta;
  rightCalendar: CalendarMeta;
  linkedCalendars: boolean;
  singleDatePicker: boolean;
  showDropdowns: boolean;
  showWeekNumbers: boolean;
  showISOWeekNumbers: boolean;
  isInvalidDate(date: Moment): boolean | string | string[];
  isCustomDate(date: Moment): boolean | string | string[];
}

/**
 * Build and write the current month grid for `side` into the given container.
 * Also updates `state.leftCalendar.calendar` / `state.rightCalendar.calendar`
 * so click/hover handlers can look up the moment instance behind a cell.
 */
export function renderCalendarInto(
  state: RenderCalendarState,
  side: CalendarSide,
  container: HTMLElement,
  moment: MomentFn,
): void {
  const calMeta = side === "left" ? state.leftCalendar : state.rightCalendar;
  const calendar = buildCalendarMatrix(calMeta.month!, state.locale.firstDay, moment);
  clampCalendarToMinMax(calendar, side, state.minDate, state.maxDate);

  if (side === "left") {
    state.leftCalendar.calendar = calendar;
  } else {
    state.rightCalendar.calendar = calendar;
  }

  const html = buildCalendarHtml(state, side, calendar);
  const target = container.querySelector(
    `.drp-calendar.${side} .calendar-table`,
  ) as HTMLElement | null;
  if (target) {
    target.innerHTML = html;
  }
}

/**
 * Pure string builder for a single calendar-side HTML table. Exported for
 * testing / reuse; normal callers should prefer {@link renderCalendarInto}.
 */
export function buildCalendarHtml(
  state: RenderCalendarState,
  side: CalendarSide,
  calendar: CalendarMatrix,
): string {
  const minDate = side === "left" ? state.minDate : state.startDate;
  let maxDate = state.maxDate;

  let html = '<table class="table-condensed">';
  html += "<thead>";
  html += "<tr>";

  if (state.showWeekNumbers || state.showISOWeekNumbers) {
    html += "<th></th>";
  }
  if (
    (!minDate || minDate.isBefore(calendar.firstDay)) &&
    (!state.linkedCalendars || side === "left")
  ) {
    html += '<th class="prev available"><span></span></th>';
  } else {
    html += "<th></th>";
  }

  let dateHtml =
    state.locale.monthNames[calendar[1][1].month()] +
    calendar[1][1].format(" YYYY");

  if (state.showDropdowns) {
    dateHtml = buildMonthYearDropdowns(state, calendar, minDate, maxDate);
  }

  html += '<th colspan="5" class="month">' + dateHtml + "</th>";
  if (
    (!maxDate || maxDate.isAfter(calendar.lastDay)) &&
    (!state.linkedCalendars || side === "right" || state.singleDatePicker)
  ) {
    html += '<th class="next available"><span></span></th>';
  } else {
    html += "<th></th>";
  }

  html += "</tr>";
  html += "<tr>";
  if (state.showWeekNumbers || state.showISOWeekNumbers) {
    html += '<th class="week">' + state.locale.weekLabel + "</th>";
  }
  for (const dayOfWeekName of state.locale.daysOfWeek) {
    html += "<th>" + dayOfWeekName + "</th>";
  }
  html += "</tr>";
  html += "</thead>";
  html += "<tbody>";

  // Adjust maxDate to reflect maxSpan when no end date is set yet.
  if (state.endDate == null && state.maxSpan) {
    const maxLimit = state.startDate.clone().add(state.maxSpan).endOf("day");
    if (!maxDate || maxLimit.isBefore(maxDate)) {
      maxDate = maxLimit;
    }
  }

  for (let row = 0; row < 6; row++) {
    html += "<tr>";
    if (state.showWeekNumbers) {
      html += '<td class="week">' + calendar[row][0].week() + "</td>";
    } else if (state.showISOWeekNumbers) {
      html += '<td class="week">' + calendar[row][0].isoWeek() + "</td>";
    }
    for (let col = 0; col < 7; col++) {
      html += buildDayCell(state, calendar, row, col, maxDate);
    }
    html += "</tr>";
  }

  html += "</tbody>";
  html += "</table>";
  return html;
}

function buildMonthYearDropdowns(
  state: RenderCalendarState,
  calendar: CalendarMatrix,
  minDate: Moment | false,
  maxDate: Moment | false,
): string {
  const currentMonth = calendar[1][1].month();
  const currentYear = calendar[1][1].year();
  const maxYear = (maxDate && maxDate.year()) || state.maxYear;
  const minYear = (minDate && minDate.year()) || state.minYear;
  const inMinYear = currentYear === minYear;
  const inMaxYear = currentYear === maxYear;

  let monthHtml = '<select class="monthselect">';
  for (let m = 0; m < 12; m++) {
    const selected = m === currentMonth ? " selected='selected'" : "";
    const disabled =
      (!inMinYear || (minDate && m >= minDate.month())) &&
      (!inMaxYear || (maxDate && m <= maxDate.month()))
        ? ""
        : " disabled='disabled'";
    monthHtml +=
      "<option value='" +
      m +
      "'" +
      selected +
      disabled +
      ">" +
      state.locale.monthNames[m] +
      "</option>";
  }
  monthHtml += "</select>";

  let yearHtml = '<select class="yearselect">';
  for (let y = minYear as number; y <= (maxYear as number); y++) {
    const selected = y === currentYear ? ' selected="selected"' : "";
    yearHtml += '<option value="' + y + '"' + selected + ">" + y + "</option>";
  }
  yearHtml += "</select>";

  return monthHtml + yearHtml;
}

function buildDayCell(
  state: RenderCalendarState,
  calendar: CalendarMatrix,
  row: number,
  col: number,
  maxDate: Moment | false | null,
): string {
  const cell = calendar[row][col];
  const classes: string[] = [];

  if (cell.isSame(new Date(), "day")) {
    classes.push("today");
  }
  if (cell.isoWeekday() > 5) {
    classes.push("weekend");
  }
  if (cell.month() !== calendar[1][1].month()) {
    classes.push("off", "ends");
  }
  if (state.minDate && cell.isBefore(state.minDate, "day")) {
    classes.push("off", "disabled");
  }
  if (maxDate && cell.isAfter(maxDate, "day")) {
    classes.push("off", "disabled");
  }
  if (state.isInvalidDate(cell)) {
    classes.push("off", "disabled");
  }
  if (cell.format("YYYY-MM-DD") === state.startDate.format("YYYY-MM-DD")) {
    classes.push("active", "start-date");
  }
  if (
    state.endDate != null &&
    cell.format("YYYY-MM-DD") === state.endDate.format("YYYY-MM-DD")
  ) {
    classes.push("active", "end-date");
  }
  if (
    state.endDate != null &&
    cell > state.startDate &&
    cell < state.endDate
  ) {
    classes.push("in-range");
  }

  const isCustom = state.isCustomDate(cell);
  if (isCustom !== false) {
    if (typeof isCustom === "string") {
      classes.push(isCustom);
    } else {
      Array.prototype.push.apply(classes, isCustom as string[]);
    }
  }

  let cname = "";
  let disabled = false;
  for (const c of classes) {
    cname += c + " ";
    if (c === "disabled") {
      disabled = true;
    }
  }
  if (!disabled) {
    cname += "available";
  }
  return (
    '<td class="' +
    cname.replace(/^\s+|\s+$/g, "") +
    '" data-title="r' +
    row +
    "c" +
    col +
    '">' +
    cell.date() +
    "</td>"
  );
}
