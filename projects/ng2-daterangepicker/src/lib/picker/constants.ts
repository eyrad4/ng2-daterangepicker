import * as momentNamespace from "moment";
import type { Locale } from "./types";

// With moduleResolution:bundler, `import *` of a CJS `export =` module loses call signatures.
type MomentFn = typeof momentNamespace & {
  (): import('moment').Moment;
};

export const DEFAULT_TEMPLATE =
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

/**
 * Fresh locale object pre-populated with moment-backed defaults.
 * A new object is returned on every call so callers can safely mutate.
 */
export function defaultLocale(moment: MomentFn): Locale {
  return {
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
}
