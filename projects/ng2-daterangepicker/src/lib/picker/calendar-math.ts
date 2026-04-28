import * as momentNamespace from "moment";
import type { Moment, MomentInput } from "moment";
import type { CalendarMatrix, CalendarSide } from "./types";

// With moduleResolution:bundler, `import *` of a CJS `export =` module loses call signatures.
type MomentFn = typeof momentNamespace & {
  (inp?: MomentInput, strict?: boolean): Moment;
  (array: number[]): Moment;
};

/**
 * Build a 6×7 matrix of moment instances for the calendar grid, padded with
 * leading/trailing days from the neighbouring months. The matrix carries
 * `firstDay` and `lastDay` (of the displayed month) as extra properties —
 * renderCalendar uses them to decide when to render the prev/next chevrons.
 *
 * Pure: the input month is cloned for reads; a fresh matrix is returned each
 * call.
 */
export function buildCalendarMatrix(
  monthAnchor: Moment,
  firstDayOfWeek: number,
  moment: MomentFn,
): CalendarMatrix {
  const month = monthAnchor.month();
  const year = monthAnchor.year();
  const hour = monthAnchor.hour();
  const minute = monthAnchor.minute();
  const second = monthAnchor.second();

  const daysInMonth = moment([year, month]).daysInMonth();
  const firstDay = moment([year, month, 1]);
  const lastDay = moment([year, month, daysInMonth]);
  const lastMonth = moment(firstDay).subtract(1, "month").month();
  const lastYear = moment(firstDay).subtract(1, "month").year();
  const daysInLastMonth = moment([lastYear, lastMonth]).daysInMonth();
  const dayOfWeek = firstDay.day();

  const calendar = [] as unknown as CalendarMatrix;
  calendar.firstDay = firstDay;
  calendar.lastDay = lastDay;

  for (let i = 0; i < 6; i++) {
    calendar[i] = [];
  }

  let startDay = daysInLastMonth - dayOfWeek + firstDayOfWeek + 1;
  if (startDay > daysInLastMonth) {
    startDay -= 7;
  }
  if (dayOfWeek === firstDayOfWeek) {
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
  }

  return calendar;
}

/**
 * Clamp any calendar cells that share the same day as minDate/maxDate but fall
 * on the wrong side of the time component. Upstream behaviour: the left
 * calendar snaps to minDate, the right calendar snaps to maxDate.
 */
export function clampCalendarToMinMax(
  calendar: CalendarMatrix,
  side: CalendarSide,
  minDate: Moment | false,
  maxDate: Moment | false,
): void {
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 7; col++) {
      const cell = calendar[row][col];
      if (
        minDate &&
        cell.format("YYYY-MM-DD") === minDate.format("YYYY-MM-DD") &&
        cell.isBefore(minDate) &&
        side === "left"
      ) {
        calendar[row][col] = minDate.clone();
      }
      if (
        maxDate &&
        cell.format("YYYY-MM-DD") === maxDate.format("YYYY-MM-DD") &&
        cell.isAfter(maxDate) &&
        side === "right"
      ) {
        calendar[row][col] = maxDate.clone();
      }
    }
  }
}
