import * as momentNamespace from "moment";
import type { Moment, MomentInput, MomentFormatSpecification } from "moment";
import { renderCalendarInto } from "./render-calendar";
import type { CalendarSide } from "./types";
import type { DateRangePicker } from "./daterangepicker";

// With moduleResolution:bundler, `import *` of a CJS `export =` module loses call signatures.
// Intersect with explicit overloads so the factory call typechecks.
type MomentFn = typeof momentNamespace & {
  (inp?: MomentInput, strict?: boolean): Moment;
  (inp?: MomentInput, format?: MomentFormatSpecification, strict?: boolean): Moment;
  (inp?: MomentInput, format?: MomentFormatSpecification, language?: string, strict?: boolean): Moment;
};
const moment = ((momentNamespace as any).default ?? momentNamespace) as MomentFn;

function parseCellTitle(el: Element): { row: number; col: number } {
  const title = el.getAttribute("data-title") || "";
  return {
    row: parseInt(title.substr(1, 1), 10) || 0,
    col: parseInt(title.substr(3, 1), 10) || 0,
  };
}

export class CalendarController {
  private picker: DateRangePicker;

  constructor(picker: DateRangePicker) {
    this.picker = picker;
  }

  updateView(): void {
    const p = this.picker;
    if (p.timePicker) {
      p.timePickerController.renderTimePicker("left");
      p.timePickerController.renderTimePicker("right");
      const rightSelects = Array.from(
        p.container.querySelectorAll(".right .calendar-time select"),
      ) as HTMLElement[];
      rightSelects.forEach((s) => {
        (s as HTMLSelectElement).disabled = !p.endDate;
        s.classList.toggle("disabled", !p.endDate);
      });
    }
    if (p.endDate) {
      const sel = p.container.querySelector(
        ".drp-selected",
      ) as HTMLElement | null;
      if (sel) {
        sel.innerHTML =
          p.startDate.format(p.locale.format) +
          p.locale.separator +
          p.endDate.format(p.locale.format);
      }
    }
    this.updateMonthsInView();
    this.updateCalendars();
    p.inputBinding.updateFormInputs();
  }

  updateMonthsInView(): void {
    const p = this.picker;
    if (p.endDate) {
      if (
        !p.singleDatePicker &&
        p.leftCalendar.month &&
        p.rightCalendar.month &&
        (p.startDate.format("YYYY-MM") ===
          p.leftCalendar.month.format("YYYY-MM") ||
          p.startDate.format("YYYY-MM") ===
            p.rightCalendar.month.format("YYYY-MM")) &&
        (p.endDate.format("YYYY-MM") ===
          p.leftCalendar.month.format("YYYY-MM") ||
          p.endDate.format("YYYY-MM") ===
            p.rightCalendar.month.format("YYYY-MM"))
      ) {
        return;
      }
      p.leftCalendar.month = p.startDate.clone().date(2);
      if (
        !p.linkedCalendars &&
        (p.endDate.month() !== p.startDate.month() ||
          p.endDate.year() !== p.startDate.year())
      ) {
        p.rightCalendar.month = p.endDate.clone().date(2);
      } else {
        p.rightCalendar.month = p.startDate.clone().date(2).add(1, "month");
      }
    } else {
      if (
        p.leftCalendar.month!.format("YYYY-MM") !==
          p.startDate.format("YYYY-MM") &&
        p.rightCalendar.month!.format("YYYY-MM") !==
          p.startDate.format("YYYY-MM")
      ) {
        p.leftCalendar.month = p.startDate.clone().date(2);
        p.rightCalendar.month = p.startDate.clone().date(2).add(1, "month");
      }
    }
    if (
      p.maxDate &&
      p.linkedCalendars &&
      !p.singleDatePicker &&
      p.rightCalendar.month! > p.maxDate
    ) {
      p.rightCalendar.month = p.maxDate.clone().date(2);
      p.leftCalendar.month = p.maxDate.clone().date(2).subtract(1, "month");
    }
  }

  updateCalendars(): void {
    const p = this.picker;
    if (p.timePicker) {
      this.syncTimePickerTimeIntoCalendarMonths();
    }
    this.renderCalendar("left");
    this.renderCalendar("right");

    Array.from(p.container.querySelectorAll(".ranges li")).forEach((li) => {
      li.classList.remove("active");
    });
    if (p.endDate == null) {
      return;
    }
    p.rangesController.calculateChosenLabel();
  }

  renderCalendar(side: CalendarSide): void {
    renderCalendarInto(this.picker, side, this.picker.container, moment);
  }

  private syncTimePickerTimeIntoCalendarMonths(): void {
    const p = this.picker;
    const side = p.endDate ? "left" : "right";
    const root = p.container.querySelector("." + side) as HTMLElement;
    let hour = parseInt(
      (root.querySelector(".hourselect") as HTMLSelectElement).value,
      10,
    );
    let minute = parseInt(
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
    const second = p.timePickerSeconds
      ? parseInt(
          (root.querySelector(".secondselect") as HTMLSelectElement).value,
          10,
        )
      : 0;
    if (!p.timePicker24Hour) {
      const ampm = (root.querySelector(".ampmselect") as HTMLSelectElement)
        .value;
      if (ampm === "PM" && hour < 12) {
        hour += 12;
      }
      if (ampm === "AM" && hour === 12) {
        hour = 0;
      }
    }
    p.leftCalendar.month!.hour(hour).minute(minute).second(second);
    p.rightCalendar.month!.hour(hour).minute(minute).second(second);
  }

  clickPrev(e: Event): void {
    const p = this.picker;
    const cal = (e.target as HTMLElement).closest(".drp-calendar");
    if (!cal) {
      return;
    }
    if (cal.classList.contains("left")) {
      p.leftCalendar.month!.subtract(1, "month");
      if (p.linkedCalendars) {
        p.rightCalendar.month!.subtract(1, "month");
      }
    } else {
      p.rightCalendar.month!.subtract(1, "month");
    }
    this.updateCalendars();
  }

  clickNext(e: Event): void {
    const p = this.picker;
    const cal = (e.target as HTMLElement).closest(".drp-calendar");
    if (!cal) {
      return;
    }
    if (cal.classList.contains("left")) {
      p.leftCalendar.month!.add(1, "month");
    } else {
      p.rightCalendar.month!.add(1, "month");
      if (p.linkedCalendars) {
        p.leftCalendar.month!.add(1, "month");
      }
    }
    this.updateCalendars();
  }

  hoverDate(e: Event): void {
    const p = this.picker;
    const target = e.target as HTMLElement;
    if (!target.classList.contains("available")) {
      return;
    }

    const { row, col } = parseCellTitle(target);
    const cal = target.closest(".drp-calendar") as HTMLElement | null;
    if (!cal) {
      return;
    }
    const date = cal.classList.contains("left")
      ? p.leftCalendar.calendar![row][col]
      : p.rightCalendar.calendar![row][col];

    if (p.endDate) {
      return;
    }
    const startDate = p.startDate;
    const leftCalendar = p.leftCalendar;
    const rightCalendar = p.rightCalendar;
    Array.from(
      p.container.querySelectorAll(".drp-calendar tbody td"),
    ).forEach((el) => {
      if (el.classList.contains("week")) {
        return;
      }
      const t = el.getAttribute("data-title");
      if (!t) {
        return;
      }
      const { row: r, col: c } = parseCellTitle(el as HTMLElement);
      const calEl = el.closest(".drp-calendar");
      if (!calEl) {
        return;
      }
      const dt = calEl.classList.contains("left")
        ? leftCalendar.calendar![r][c]
        : rightCalendar.calendar![r][c];
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

  clickDate(e: Event): void {
    const p = this.picker;
    const target = e.target as HTMLElement;
    if (!target.classList.contains("available")) {
      return;
    }

    const { row, col } = parseCellTitle(target);
    const cal = target.closest(".drp-calendar") as HTMLElement | null;
    if (!cal) {
      return;
    }
    let date = cal.classList.contains("left")
      ? p.leftCalendar.calendar![row][col]
      : p.rightCalendar.calendar![row][col];

    if (p.endDate || date.isBefore(p.startDate, "day")) {
      if (p.timePicker) {
        date = date.clone();
        this.applyTimeSelectionsToDate("left", date);
      }
      // Temporarily null to signal "first date selected, awaiting second".
      // endDate is typed Moment for public API; the null is an internal sentinel.
      (p as { endDate: Moment | null }).endDate = null;
      p.setStartDate(date.clone ? date.clone() : moment(date));
    } else if (!p.endDate && date.isBefore(p.startDate)) {
      p.setEndDate(p.startDate.clone());
    } else {
      if (p.timePicker) {
        date = date.clone();
        this.applyTimeSelectionsToDate("right", date);
      }
      p.setEndDate(date.clone ? date.clone() : moment(date));
      if (p.autoApply) {
        p.rangesController.calculateChosenLabel();
        p.lifecycleController.clickApply();
      }
    }

    if (p.singleDatePicker) {
      p.setEndDate(p.startDate);
      if (!p.timePicker && p.autoApply) {
        p.lifecycleController.clickApply();
      }
    }

    p.updateView();
    e.stopPropagation();
  }

  private applyTimeSelectionsToDate(side: CalendarSide, date: Moment): void {
    const p = this.picker;
    const root = p.container.querySelector("." + side) as HTMLElement | null;
    if (!root) {
      return;
    }
    let hour = parseInt(
      (root.querySelector(".hourselect") as HTMLSelectElement).value,
      10,
    );
    if (!p.timePicker24Hour) {
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
      minute = parseInt(
        (opts[opts.length - 1] as HTMLOptionElement).value,
        10,
      );
    }
    const second = p.timePickerSeconds
      ? parseInt(
          (root.querySelector(".secondselect") as HTMLSelectElement).value,
          10,
        )
      : 0;
    date.hour(hour).minute(minute).second(second);
  }

  monthOrYearChanged(e: Event): void {
    const p = this.picker;
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
    let year = parseInt(
      (cal.querySelector(".yearselect") as HTMLSelectElement).value,
      10,
    );

    if (!isLeft) {
      if (
        year < p.startDate.year() ||
        (year === p.startDate.year() && month < p.startDate.month())
      ) {
        month = p.startDate.month();
        year = p.startDate.year();
      }
    }
    if (p.minDate) {
      if (
        year < p.minDate.year() ||
        (year === p.minDate.year() && month < p.minDate.month())
      ) {
        month = p.minDate.month();
        year = p.minDate.year();
      }
    }
    if (p.maxDate) {
      if (
        year > p.maxDate.year() ||
        (year === p.maxDate.year() && month > p.maxDate.month())
      ) {
        month = p.maxDate.month();
        year = p.maxDate.year();
      }
    }

    if (isLeft) {
      p.leftCalendar.month!.month(month).year(year);
      if (p.linkedCalendars) {
        p.rightCalendar.month = p.leftCalendar.month!.clone().add(1, "month");
      }
    } else {
      p.rightCalendar.month!.month(month).year(year);
      if (p.linkedCalendars) {
        p.leftCalendar.month = p.rightCalendar.month!
          .clone()
          .subtract(1, "month");
      }
    }
    this.updateCalendars();
  }
}
