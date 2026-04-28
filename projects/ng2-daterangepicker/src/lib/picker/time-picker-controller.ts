import { renderTimePickerInto } from "./render-time-picker";
import type { CalendarSide } from "./types";
import type { DateRangePicker } from "./daterangepicker";

export class TimePickerController {
  private picker: DateRangePicker;

  constructor(picker: DateRangePicker) {
    this.picker = picker;
  }

  renderTimePicker(side: CalendarSide): void {
    renderTimePickerInto(this.picker, side, this.picker.container);
  }

  timeChanged(e: Event): void {
    const p = this.picker;
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
      minute = parseInt(
        (opts[opts.length - 1] as HTMLOptionElement).value,
        10,
      );
    }
    const second = p.timePickerSeconds
      ? parseInt(
          (cal.querySelector(".secondselect") as HTMLSelectElement).value,
          10,
        )
      : 0;

    if (!p.timePicker24Hour) {
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
      const start = p.startDate.clone();
      start.hour(hour);
      start.minute(minute);
      start.second(second);
      p.setStartDate(start);
      if (p.singleDatePicker) {
        p.endDate = p.startDate.clone();
      } else if (
        p.endDate &&
        p.endDate.format("YYYY-MM-DD") === start.format("YYYY-MM-DD") &&
        p.endDate.isBefore(start)
      ) {
        p.setEndDate(start.clone());
      }
    } else if (p.endDate) {
      const end = p.endDate.clone();
      end.hour(hour);
      end.minute(minute);
      end.second(second);
      p.setEndDate(end);
    }

    p.updateCalendars();
    p.updateFormInputs();
    this.renderTimePicker("left");
    this.renderTimePicker("right");
  }
}
