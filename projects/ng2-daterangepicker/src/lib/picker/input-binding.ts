import * as momentNamespace from "moment";
import type { Moment, MomentInput, MomentFormatSpecification } from "moment";
import { trigger } from "./dom-utils";
import type { DateRangePicker } from "./daterangepicker";

// With moduleResolution:bundler, `import *` of a CJS `export =` module loses call signatures.
// Intersect with explicit overloads so the factory call typechecks.
type MomentFn = typeof momentNamespace & {
  (inp?: MomentInput, strict?: boolean): Moment;
  (inp?: MomentInput, format?: MomentFormatSpecification, strict?: boolean): Moment;
};
const moment = ((momentNamespace as any).default ?? momentNamespace) as MomentFn;

export class InputBinding {
  private picker: DateRangePicker;

  constructor(picker: DateRangePicker) {
    this.picker = picker;
  }

  updateFormInputs(): void {
    const p = this.picker;
    const applyBtn = p.container.querySelector(
      "button.applyBtn",
    ) as HTMLButtonElement | null;
    if (!applyBtn) {
      return;
    }
    const enabled =
      p.singleDatePicker ||
      (p.endDate &&
        (p.startDate.isBefore(p.endDate) || p.startDate.isSame(p.endDate)));
    applyBtn.disabled = !enabled;
  }

  elementChanged(_e?: Event): void {
    const p = this.picker;
    if (!(p.element instanceof HTMLInputElement)) {
      return;
    }
    const val = p.element.value;
    if (!val.length) {
      return;
    }

    const dateString = val.split(p.locale.separator);
    let s: Moment | null = null;
    let e: Moment | null = null;
    if (dateString.length === 2) {
      s = moment(dateString[0], p.locale.format);
      e = moment(dateString[1], p.locale.format);
    }
    if (p.singleDatePicker || s === null || e === null) {
      s = moment(val, p.locale.format);
      e = s;
    }
    if (!s!.isValid() || !e!.isValid()) {
      return;
    }
    p.setStartDate(s!);
    p.setEndDate(e!);
    p.updateView();
  }

  keydown(e: KeyboardEvent): void {
    if (e.keyCode === 9 || e.keyCode === 13) {
      this.picker.hide();
    }
    if (e.keyCode === 27) {
      e.preventDefault();
      e.stopPropagation();
      this.picker.hide();
    }
  }

  updateElement(): void {
    const p = this.picker;
    if (!(p.element instanceof HTMLInputElement) || !p.autoUpdateInput) {
      return;
    }
    let newValue = p.startDate.format(p.locale.format);
    if (!p.singleDatePicker) {
      newValue += p.locale.separator + p.endDate!.format(p.locale.format);
    }
    if (newValue !== p.element.value) {
      p.element.value = newValue;
      trigger(p.element, "change");
    }
  }
}
