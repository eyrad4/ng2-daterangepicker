import type { Moment, DurationInputObject } from 'moment';
import type { Cleanup } from "./dom-utils";

export type CalendarSide = "left" | "right";
export type DrpOpens = "left" | "right" | "center";
export type DrpDrops = "down" | "up" | "auto";

export interface Locale {
  direction: string;
  format: string;
  separator: string;
  applyLabel: string;
  cancelLabel: string;
  weekLabel: string;
  customRangeLabel: string;
  daysOfWeek: string[];
  monthNames: string[];
  firstDay: number;
}

export type PickerCallback = (start: Moment, end: Moment, label?: string) => void;

/** 6x7 matrix of moment instances produced by {@link buildCalendarMatrix}. */
export type CalendarMatrix = Moment[][] & { firstDay: Moment; lastDay: Moment };

export interface CalendarMeta {
  month?: Moment;
  calendar?: CalendarMatrix;
}

export interface DateRangePickerOptions {
  startDate?: string | Moment | Date;
  endDate?: string | Moment | Date;
  minDate?: string | Moment | Date | false;
  maxDate?: string | Moment | Date | false;
  maxSpan?: DurationInputObject | false;
  dateLimit?: DurationInputObject | false;
  autoApply?: boolean;
  singleDatePicker?: boolean;
  showDropdowns?: boolean;
  minYear?: number;
  maxYear?: number;
  showWeekNumbers?: boolean;
  showISOWeekNumbers?: boolean;
  showCustomRangeLabel?: boolean;
  timePicker?: boolean;
  timePicker24Hour?: boolean;
  timePickerIncrement?: number;
  timePickerSeconds?: boolean;
  linkedCalendars?: boolean;
  autoUpdateInput?: boolean;
  alwaysShowCalendars?: boolean;
  opens?: DrpOpens;
  drops?: DrpDrops;
  buttonClasses?: string | string[];
  applyButtonClasses?: string;
  applyClass?: string;
  cancelButtonClasses?: string;
  cancelClass?: string;
  ranges?: Record<string, [string | Moment | Date, string | Moment | Date]>;
  locale?: Partial<Locale>;
  parentEl?: HTMLElement | string;
  template?: string;
  isInvalidDate?: (date: Moment) => boolean | string | string[];
  isCustomDate?: (date: Moment) => boolean | string | string[];
  customClasses?: string | string[];
}

export interface PickerOutputEvent {
  event: CustomEvent;
  picker: import('./daterangepicker').DateRangePicker;
}

export { Cleanup };
