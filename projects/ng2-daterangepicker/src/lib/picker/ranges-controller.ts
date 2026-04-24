import type { DateRangePicker } from "./daterangepicker";

export class RangesController {
  private picker: DateRangePicker;

  constructor(picker: DateRangePicker) {
    this.picker = picker;
  }

  clickRange(e: Event): void {
    const p = this.picker;
    const target = e.target as HTMLElement;
    const label = target.getAttribute("data-range-key");
    p.chosenLabel = label;
    if (label === p.locale.customRangeLabel) {
      p.showCalendars();
    } else {
      const dates = p.ranges[label!];
      p.startDate = dates[0];
      p.endDate = dates[1];
      if (!p.timePicker) {
        p.startDate.startOf("day");
        p.endDate.endOf("day");
      }
      if (!p.alwaysShowCalendars) {
        p.hideCalendars();
      }
      p.clickApply();
    }
  }

  calculateChosenLabel(): void {
    const p = this.picker;
    let customRange = true;
    let i = 0;
    const items = Array.from(
      p.container.querySelectorAll(".ranges li"),
    ) as HTMLElement[];
    for (const range of Object.keys(p.ranges)) {
      const matches = p.timePicker
        ? this.rangeMatchesByTime(range)
        : this.rangeMatchesByDay(range);
      if (matches) {
        customRange = false;
        if (items[i]) {
          items[i].classList.add("active");
          p.chosenLabel = items[i].getAttribute("data-range-key");
        }
        break;
      }
      i++;
    }
    if (customRange) {
      if (p.showCustomRangeLabel) {
        const last = items[items.length - 1];
        if (last) {
          last.classList.add("active");
          p.chosenLabel = last.getAttribute("data-range-key");
        }
      } else {
        p.chosenLabel = null;
      }
      p.showCalendars();
    }
  }

  private rangeMatchesByTime(range: string): boolean {
    const p = this.picker;
    const format = p.timePickerSeconds
      ? "YYYY-MM-DD HH:mm:ss"
      : "YYYY-MM-DD HH:mm";
    return (
      p.startDate.format(format) === p.ranges[range][0].format(format) &&
      p.endDate!.format(format) === p.ranges[range][1].format(format)
    );
  }

  private rangeMatchesByDay(range: string): boolean {
    const p = this.picker;
    return (
      p.startDate.format("YYYY-MM-DD") ===
        p.ranges[range][0].format("YYYY-MM-DD") &&
      p.endDate!.format("YYYY-MM-DD") ===
        p.ranges[range][1].format("YYYY-MM-DD")
    );
  }
}
