import { delegate, on, trigger } from "./dom-utils";
import { positionPicker } from "./positioning";
import type { DateRangePicker } from "./daterangepicker";

export class LifecycleController {
  private picker: DateRangePicker;

  constructor(picker: DateRangePicker) {
    this.picker = picker;
  }

  show(_e?: Event): void {
    const p = this.picker;
    if (p.isShowing) {
      return;
    }

    const outsideClickProxy = (e: Event) => this.outsideClick(e);
    p.documentCleanups.push(
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
    p.resizeCleanup = on(window, "resize", () => this.move());

    p.oldStartDate = p.startDate.clone();
    p.oldEndDate = p.endDate!.clone();
    p.previousRightTime = p.endDate!.clone();

    p.updateView();
    p.container.style.display = "block";
    this.move();
    trigger(p.element, "show.daterangepicker", { picker: p });
    p.isShowing = true;
  }

  hide(_e?: Event): void {
    const p = this.picker;
    if (!p.isShowing) {
      return;
    }

    if (!p.endDate) {
      p.startDate = p.oldStartDate.clone();
      p.endDate = p.oldEndDate.clone();
    }
    if (
      !p.startDate.isSame(p.oldStartDate) ||
      !p.endDate!.isSame(p.oldEndDate)
    ) {
      p.callback(p.startDate.clone(), p.endDate!.clone(), p.chosenLabel ?? undefined);
    }
    p.updateElement();

    p.documentCleanups.forEach((c) => { c(); });
    p.documentCleanups = [];
    if (p.resizeCleanup) {
      p.resizeCleanup();
      p.resizeCleanup = null;
    }

    p.container.style.display = "none";
    trigger(p.element, "hide.daterangepicker", { picker: p });
    p.isShowing = false;
  }

  toggle(_e?: Event): void {
    if (this.picker.isShowing) {
      this.hide();
    } else {
      this.show();
    }
  }

  outsideClick(e: Event): void {
    const p = this.picker;
    const target = e.target as HTMLElement | null;
    if (!target) {
      return;
    }
    if (
      e.type === "focusin" ||
      target === p.element ||
      p.element.contains(target) ||
      target === p.container ||
      p.container.contains(target) ||
      target.closest(".calendar-table")
    ) {
      return;
    }
    this.hide();
    trigger(p.element, "outsideClick.daterangepicker", { picker: p });
  }

  showCalendars(): void {
    const p = this.picker;
    p.container.classList.add("show-calendar");
    this.move();
    trigger(p.element, "showCalendar.daterangepicker", { picker: p });
  }

  hideCalendars(): void {
    const p = this.picker;
    p.container.classList.remove("show-calendar");
    trigger(p.element, "hideCalendar.daterangepicker", { picker: p });
  }

  move(): void {
    positionPicker(this.picker);
  }

  clickApply(_e?: Event): void {
    this.hide();
    trigger(this.picker.element, "apply.daterangepicker", {
      picker: this.picker,
    });
  }

  clickCancel(_e?: Event): void {
    const p = this.picker;
    p.startDate = p.oldStartDate;
    p.endDate = p.oldEndDate;
    this.hide();
    trigger(p.element, "cancel.daterangepicker", { picker: p });
  }
}
