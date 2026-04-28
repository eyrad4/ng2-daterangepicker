import type { Moment, DurationInputObject } from "moment";
import type { CalendarSide } from "./types";

/** Picker fields the time-picker renderer needs. */
export interface RenderTimePickerState {
  startDate: Moment;
  endDate: Moment | null;
  minDate: Moment | false;
  maxDate: Moment | false;
  maxSpan: DurationInputObject | false;
  timePicker24Hour: boolean;
  timePickerIncrement: number;
  timePickerSeconds: boolean;
}

/**
 * Render the time-picker <select>s for the given side into the picker
 * container. Returns early for the right side when no end date is set
 * (matches upstream). The right side preserves the already-selected time
 * from the existing DOM if present — that read happens via `container`.
 */
export function renderTimePickerInto(
  state: RenderTimePickerState,
  side: CalendarSide,
  container: HTMLElement,
): void {
  if (side === "right" && !state.endDate) {
    return;
  }

  const target = container.querySelector(
    `.drp-calendar.${side} .calendar-time`,
  ) as HTMLElement | null;
  if (!target) {
    return;
  }

  const selected = pickSelectedMoment(state, side, container);
  const minDate = side === "left" ? state.minDate : state.startDate;
  const maxDate = effectiveMaxDate(state);

  target.innerHTML = buildTimePickerHtml(state, selected, minDate, maxDate);
}

function effectiveMaxDate(state: RenderTimePickerState): Moment | false {
  if (
    state.maxSpan &&
    (!state.maxDate ||
      state.startDate.clone().add(state.maxSpan).isBefore(state.maxDate))
  ) {
    return state.startDate.clone().add(state.maxSpan);
  }
  return state.maxDate;
}

function pickSelectedMoment(
  state: RenderTimePickerState,
  side: CalendarSide,
  container: HTMLElement,
): Moment {
  if (side === "left") {
    return state.startDate.clone();
  }

  let selected = state.endDate!.clone();
  const timeSelector = container.querySelector(
    ".drp-calendar.right .calendar-time",
  ) as HTMLElement | null;
  if (timeSelector && timeSelector.innerHTML !== "") {
    const optVal = (sel: string): string => {
      const el = timeSelector.querySelector(
        sel + " option:checked",
      ) as HTMLOptionElement | null;
      return el ? el.value : "";
    };
    selected.hour(!isNaN(selected.hour()) ? selected.hour() : parseInt(optVal(".hourselect"), 10));
    selected.minute(
      !isNaN(selected.minute()) ? selected.minute() : parseInt(optVal(".minuteselect"), 10),
    );
    selected.second(
      !isNaN(selected.second()) ? selected.second() : parseInt(optVal(".secondselect"), 10),
    );
    if (!state.timePicker24Hour) {
      const ampm = optVal(".ampmselect");
      if (ampm === "PM" && selected.hour() < 12) {
        selected.hour(selected.hour() + 12);
      }
      if (ampm === "AM" && selected.hour() === 12) {
        selected.hour(0);
      }
    }
  }

  if (selected.isBefore(state.startDate)) {
    selected = state.startDate.clone();
  }
  const maxDate = effectiveMaxDate(state);
  if (maxDate && selected.isAfter(maxDate)) {
    selected = maxDate.clone();
  }
  return selected;
}

/** Pure builder: renders hour/minute/second/ampm <select>s as an HTML string. */
export function buildTimePickerHtml(
  state: RenderTimePickerState,
  selected: Moment,
  minDate: Moment | false,
  maxDate: Moment | false,
): string {
  let html = buildHourSelect(state, selected, minDate, maxDate);
  html += buildMinuteSelect(state, selected, minDate, maxDate);
  if (state.timePickerSeconds) {
    html += buildSecondSelect(selected, minDate, maxDate);
  }
  if (!state.timePicker24Hour) {
    html += buildAmPmSelect(selected, minDate, maxDate);
  }
  return html;
}

function buildHourSelect(
  state: RenderTimePickerState,
  selected: Moment,
  minDate: Moment | false,
  maxDate: Moment | false,
): string {
  let html = '<select class="hourselect">';
  const start = state.timePicker24Hour ? 0 : 1;
  const end = state.timePicker24Hour ? 23 : 12;
  for (let i = start; i <= end; i++) {
    let i_in_24 = i;
    if (!state.timePicker24Hour) {
      i_in_24 =
        selected.hour() >= 12 ? (i === 12 ? 12 : i + 12) : i === 12 ? 0 : i;
    }
    const time = selected.clone().hour(i_in_24);
    const disabled =
      (minDate && time.minute(59).isBefore(minDate)) ||
      (maxDate && time.minute(0).isAfter(maxDate));
    html += renderTimeOption(i, i.toString(), i_in_24 === selected.hour(), disabled);
  }
  html += "</select> ";
  return html;
}

function buildMinuteSelect(
  state: RenderTimePickerState,
  selected: Moment,
  minDate: Moment | false,
  maxDate: Moment | false,
): string {
  let html = ': <select class="minuteselect">';
  for (let i = 0; i < 60; i += state.timePickerIncrement) {
    const padded = i < 10 ? "0" + i : i.toString();
    const time = selected.clone().minute(i);
    const disabled =
      (minDate && time.second(59).isBefore(minDate)) ||
      (maxDate && time.second(0).isAfter(maxDate));
    html += renderTimeOption(i, padded, selected.minute() === i, disabled);
  }
  html += "</select> ";
  return html;
}

function buildSecondSelect(selected: Moment, minDate: Moment | false, maxDate: Moment | false): string {
  let html = ': <select class="secondselect">';
  for (let i = 0; i < 60; i++) {
    const padded = i < 10 ? "0" + i : i.toString();
    const time = selected.clone().second(i);
    const disabled =
      (minDate && time.isBefore(minDate)) ||
      (maxDate && time.isAfter(maxDate));
    html += renderTimeOption(i, padded, selected.second() === i, disabled);
  }
  html += "</select> ";
  return html;
}

function buildAmPmSelect(selected: Moment, minDate: Moment | false, maxDate: Moment | false): string {
  let html = '<select class="ampmselect">';
  let amAttrs = "";
  let pmAttrs = "";
  if (
    minDate &&
    selected.clone().hour(12).minute(0).second(0).isBefore(minDate)
  ) {
    amAttrs = ' disabled="disabled" class="disabled"';
  }
  if (
    maxDate &&
    selected.clone().hour(0).minute(0).second(0).isAfter(maxDate)
  ) {
    pmAttrs = ' disabled="disabled" class="disabled"';
  }
  if (selected.hour() >= 12) {
    html +=
      '<option value="AM"' +
      amAttrs +
      '>AM</option><option value="PM" selected="selected"' +
      pmAttrs +
      ">PM</option>";
  } else {
    html +=
      '<option value="AM" selected="selected"' +
      amAttrs +
      '>AM</option><option value="PM"' +
      pmAttrs +
      ">PM</option>";
  }
  html += "</select>";
  return html;
}

function renderTimeOption(
  value: number,
  label: string,
  selected: boolean,
  disabled: boolean,
): string {
  if (selected && !disabled) {
    return '<option value="' + value + '" selected="selected">' + label + "</option>";
  }
  if (disabled) {
    return (
      '<option value="' +
      value +
      '" disabled="disabled" class="disabled">' +
      label +
      "</option>"
    );
  }
  return '<option value="' + value + '">' + label + "</option>";
}
