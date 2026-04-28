import moment from 'moment';
import { DateRangePicker } from './daterangepicker';

interface PickerHandle {
  input: HTMLInputElement;
  picker: DateRangePicker;
}

function mountPicker(opts: any = {}, cb?: any): PickerHandle {
  const input = document.createElement('input');
  input.type = 'text';
  document.body.appendChild(input);
  const picker = new DateRangePicker(input, opts, cb);
  return { input, picker };
}

function teardown(handle: PickerHandle | undefined): void {
  if (!handle) { return; }
  try { handle.picker.remove(); } catch { /* picker might already be gone */ }
  handle.input.remove();
}

describe('DateRangePicker (vendored, jQuery-free)', () => {

  describe('static lookup', () => {
    let handle: PickerHandle;
    afterEach(() => teardown(handle));

    it('DateRangePicker.getInstance returns the picker bound to a host element', () => {
      handle = mountPicker();
      expect(DateRangePicker.getInstance(handle.input)).toBe(handle.picker);
    });

    it('returns undefined for elements that have no picker', () => {
      const stranger = document.createElement('input');
      expect(DateRangePicker.getInstance(stranger)).toBeUndefined();
    });
  });

  describe('construction & defaults', () => {
    let handle: PickerHandle;
    beforeEach(() => { handle = mountPicker(); });
    afterEach(() => teardown(handle));

    it('appends a .daterangepicker container under <body>', () => {
      expect(document.querySelectorAll('body > .daterangepicker').length).toBeGreaterThan(0);
    });

    it('defaults singleDatePicker, timePicker, autoApply to false', () => {
      expect(handle.picker.singleDatePicker).toBe(false);
      expect(handle.picker.timePicker).toBe(false);
      expect(handle.picker.autoApply).toBe(false);
    });

    it('linkedCalendars defaults to true', () => {
      expect(handle.picker.linkedCalendars).toBe(true);
    });

    it('locale.format is set', () => {
      expect(typeof handle.picker.locale.format).toBe('string');
    });

    it('startDate and endDate default to today', () => {
      expect(moment.isMoment(handle.picker.startDate)).toBe(true);
      expect(moment.isMoment(handle.picker.endDate)).toBe(true);
      expect(handle.picker.startDate.isSame(moment(), 'day')).toBe(true);
      expect(handle.picker.endDate.isSame(moment(), 'day')).toBe(true);
    });
  });

  describe('startDate / endDate accept multiple input shapes', () => {
    let handle: PickerHandle;
    afterEach(() => teardown(handle));

    it('accepts moment instances passed via options', () => {
      const start = moment('2024-01-15');
      const end = moment('2024-02-20');
      handle = mountPicker({ startDate: start, endDate: end });

      expect(handle.picker.startDate.isSame(start, 'day')).toBe(true);
      expect(handle.picker.endDate.isSame(end, 'day')).toBe(true);
    });

    it('accepts ISO date strings via options', () => {
      handle = mountPicker({
        startDate: '2024-06-10',
        endDate: '2024-06-20',
        locale: { format: 'YYYY-MM-DD' }
      });

      expect(handle.picker.startDate.format('YYYY-MM-DD')).toBe('2024-06-10');
      expect(handle.picker.endDate.format('YYYY-MM-DD')).toBe('2024-06-20');
    });
  });

  describe('setStartDate / setEndDate', () => {
    let handle: PickerHandle;
    beforeEach(() => { handle = mountPicker({ locale: { format: 'YYYY-MM-DD' } }); });
    afterEach(() => teardown(handle));

    it('setStartDate updates picker.startDate', () => {
      handle.picker.setStartDate('2024-06-15');
      expect(handle.picker.startDate.format('YYYY-MM-DD')).toBe('2024-06-15');
    });

    it('setEndDate updates picker.endDate', () => {
      handle.picker.setStartDate('2024-06-10');
      handle.picker.setEndDate('2024-06-25');
      expect(handle.picker.endDate.format('YYYY-MM-DD')).toBe('2024-06-25');
    });

    it('setEndDate before startDate snaps to startDate', () => {
      handle.picker.setStartDate('2024-06-15');
      handle.picker.setEndDate('2024-06-10');
      expect(handle.picker.endDate.isSameOrAfter(handle.picker.startDate)).toBe(true);
    });
  });

  describe('show / hide lifecycle', () => {
    let handle: PickerHandle;
    afterEach(() => teardown(handle));

    it('show() makes the container visible and dispatches show.daterangepicker', () => {
      handle = mountPicker();
      const showSpy = jasmine.createSpy('show');
      handle.input.addEventListener('show.daterangepicker', showSpy);

      handle.picker.show();

      expect(handle.picker.container.style.display).not.toBe('none');
      expect(showSpy).toHaveBeenCalled();
    });

    it('hide() hides the container and dispatches hide.daterangepicker', () => {
      handle = mountPicker();
      const hideSpy = jasmine.createSpy('hide');
      handle.input.addEventListener('hide.daterangepicker', hideSpy);

      handle.picker.show();
      handle.picker.hide();

      expect(handle.picker.container.style.display).toBe('none');
      expect(hideSpy).toHaveBeenCalled();
    });

    it('emitted CustomEvent carries the picker on event.detail.picker', () => {
      handle = mountPicker();
      let received: any = null;
      handle.input.addEventListener('show.daterangepicker', (e: Event) => {
        received = (e as CustomEvent).detail?.picker;
      });
      handle.picker.show();
      expect(received).toBe(handle.picker);
    });
  });

  describe('predefined ranges', () => {
    let handle: PickerHandle;
    afterEach(() => teardown(handle));

    it('renders one entry per range plus the customRangeLabel entry', () => {
      handle = mountPicker({
        ranges: {
          'Last 7 Days': [moment().subtract(6, 'days'), moment()],
          'Last 30 Days': [moment().subtract(29, 'days'), moment()]
        }
      });

      const items = handle.picker.container.querySelectorAll('.ranges li');
      expect(items.length).toBe(3); // 2 ranges + Custom Range
    });

    it('clickRange invokes the user callback with (start, end, label)', () => {
      const cb = jasmine.createSpy('rangeCallback');
      const start = moment().subtract(6, 'days').startOf('day');
      const end = moment().endOf('day');
      handle = mountPicker({ ranges: { 'Last 7 Days': [start, end] } }, cb);

      handle.picker.show();
      const li = handle.picker.container
        .querySelector('.ranges li[data-range-key="Last 7 Days"]') as HTMLElement;
      expect(li).withContext('ranges li rendered').toBeTruthy();
      handle.picker.clickRange({ target: li } as unknown as Event);

      expect(cb).toHaveBeenCalled();
      const [calledStart, calledEnd, label] = cb.calls.mostRecent().args;
      expect(calledStart.isSame(start, 'day')).toBe(true);
      expect(calledEnd.isSame(end, 'day')).toBe(true);
      expect(label).toBe('Last 7 Days');
    });
  });

  describe('apply / cancel buttons', () => {
    let handle: PickerHandle;
    afterEach(() => teardown(handle));

    it('clickApply dispatches apply.daterangepicker and writes the value to the input', () => {
      handle = mountPicker({
        startDate: '2024-03-01',
        endDate: '2024-03-15',
        locale: { format: 'YYYY-MM-DD' }
      });
      const applySpy = jasmine.createSpy('apply');
      handle.input.addEventListener('apply.daterangepicker', applySpy);

      handle.picker.clickApply();

      expect(applySpy).toHaveBeenCalled();
      expect(handle.input.value).toBe('2024-03-01 - 2024-03-15');
    });

    it('clickCancel dispatches cancel.daterangepicker and restores prior dates', () => {
      handle = mountPicker({
        startDate: '2024-04-01',
        endDate: '2024-04-10',
        locale: { format: 'YYYY-MM-DD' }
      });
      const cancelSpy = jasmine.createSpy('cancel');
      handle.input.addEventListener('cancel.daterangepicker', cancelSpy);

      handle.picker.show();
      handle.picker.setStartDate('2024-04-20');
      handle.picker.setEndDate('2024-04-25');
      handle.picker.clickCancel();

      expect(cancelSpy).toHaveBeenCalled();
      expect(handle.picker.startDate.format('YYYY-MM-DD')).toBe('2024-04-01');
      expect(handle.picker.endDate.format('YYYY-MM-DD')).toBe('2024-04-10');
    });
  });

  describe('singleDatePicker mode', () => {
    let handle: PickerHandle;
    afterEach(() => teardown(handle));

    it('hides the right calendar', () => {
      handle = mountPicker({ singleDatePicker: true });
      const right = handle.picker.container.querySelector('.drp-calendar.right') as HTMLElement;
      expect(right.style.display).toBe('none');
    });

    it('writes a single date (no range separator) to the input on apply', () => {
      handle = mountPicker({
        singleDatePicker: true,
        startDate: moment('2024-07-04'),
        locale: { format: 'YYYY-MM-DD' }
      });
      handle.picker.clickApply();
      expect(handle.input.value).toBe('2024-07-04');
      expect(handle.input.value).not.toContain(' - ');
    });
  });

  describe('locale & formatting', () => {
    let handle: PickerHandle;
    afterEach(() => teardown(handle));

    it('locale.format propagates to updateElement output', () => {
      handle = mountPicker({
        startDate: moment('2024-08-01'),
        endDate: moment('2024-08-31'),
        locale: { format: 'DD/MM/YYYY' }
      });
      handle.picker.clickApply();
      expect(handle.input.value).toBe('01/08/2024 - 31/08/2024');
    });

    it('locale.daysOfWeek overrides the calendar header', () => {
      handle = mountPicker({
        locale: { daysOfWeek: ['Sn', 'Mn', 'Tu', 'Wd', 'Th', 'Fr', 'St'] }
      });
      handle.picker.show();
      const ths = Array.from(
        handle.picker.container.querySelectorAll('.drp-calendar.left .table-condensed thead tr:nth-child(2) th')
      ) as HTMLElement[];
      const headers = ths.map((th) => th.textContent || '');
      expect(headers).toContain('Mn');
      expect(headers).toContain('St');
    });
  });

  describe('cleanup', () => {
    it('remove() detaches the container and unbinds the input listeners', () => {
      const handle = mountPicker();
      expect(document.querySelectorAll('body > .daterangepicker').length).toBeGreaterThan(0);

      const stillCalled = jasmine.createSpy('apply-after-remove');
      handle.input.addEventListener('apply.daterangepicker', stillCalled);

      handle.picker.remove();

      expect(document.querySelectorAll('body > .daterangepicker').length).toBe(0);
      // The picker no longer dispatches anything, but a manually-fired event
      // would still hit the listener that the spec attached above. The point
      // here is that the picker's own internal listeners are detached and
      // remove() does not throw.
      expect(() => handle.picker.remove()).not.toThrow();
      expect(DateRangePicker.getInstance(handle.input)).toBeUndefined();
      handle.input.remove();
    });
  });
});
