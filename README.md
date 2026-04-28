ng2-daterangepicker
-------------------

![Daterange Picker](https://raw.githubusercontent.com/evansmwendwa/ng2-daterangepicker/master/projects/ng2-daterangepicker/assets/screen-shot.png)

This library targets Angular 20+. It ships a standalone directive (`DaterangepickerComponent`) and the vendored date-range picker source as a jQuery-free TypeScript class (`DateRangePicker`). Moment.js stays as the only runtime peer dependency.

## Version history

- **5.0.0** — Angular 9 → 20 upgrade. Standalone directive; `@angular/build:application` (esbuild) builder; `ng-packagr` 20; ESLint-ready. The `Daterangepicker` NgModule was removed — import `DaterangepickerComponent` directly.
- **4.0.0** — jQuery removed. Vendored picker rewritten in TypeScript with native DOM APIs and `CustomEvent`. `moment` is the only runtime peer.
- **3.x** — Angular 9 support, last jQuery-based release.

### Installation

Use your preferred package manager
```
npm install ng2-daterangepicker
yarn add ng2-daterangepicker
ng add ng2-daterangepicker
```

#### peerDependencies

Please note and install the following peerDependencies if necessary for your setup

```json
"peerDependencies": {
  "moment": "^2.24.0"
}
```

### Update tsconfig.json

Update tsconfig.json file in your project root to allow syntectic default imports

```javascript
"allowSyntheticDefaultImports": true
```

### Usage

Add the daterangepicker stylesheet to `angular.json`. The library no longer
requires jQuery — only Moment.js as a peer dependency.

```json
{
  "styles": [
    "node_modules/ng2-daterangepicker/assets/daterangepicker.css"
  ]
}
```

### Import the standalone directive

Import `DaterangepickerComponent` directly into your standalone component's `imports` array:

```ts
import { Component } from '@angular/core';
import { DaterangepickerComponent } from 'ng2-daterangepicker';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DaterangepickerComponent],
  templateUrl: './app.component.html'
})
export class AppComponent {}
```

For NgModule-based apps (if you still have any), standalone directives are usable in `imports: []`:

```ts
@NgModule({
  imports: [DaterangepickerComponent]
})
export class AppModule {}
```

Use the `daterangepicker` directive in your component by passing in options `{}` and consuming the `selected` event. Directive can be added to inputs, buttons or any other html element.

### Component Template

``` html
<input type="text" name="daterangeInput" daterangepicker [options]="options" (selected)="selectedDate($event, daterange)" />
```

### Component

```javascript
export class AppComponent {

  public daterange: any = {};

  // see original project for full list of options
  // can also be setup using the config service to apply to multiple pickers
  public options: any = {
    locale: { format: 'YYYY-MM-DD' },
    alwaysShowCalendars: false,
  };

  public selectedDate(value: any, datepicker?: any) {
    // this is the date  selected
    console.log(value);

    // any object can be passed to the selected event and it will be passed back here
    datepicker.start = value.start;
    datepicker.end = value.end;

    // use passed valuable to update state
    this.daterange.start = value.start;
    this.daterange.end = value.end;
    this.daterange.label = value.label;
  }
}
```

### Using Multiple Instances

You can pass global settings that can be overloaded by the `options` object in the daterangepicker instances. Use the `DaterangepickerConfig` service to do so. The service provider is set in the daterangepicker module.

``` javascript
import { DaterangepickerConfig } from 'ng2-daterangepicker';

@Component({
    selector:'my-app',
    template:'<h3>Component Template</h3>'
})
export class AppComponent {

    constructor(private daterangepickerOptions: DaterangepickerConfig) {
        this.daterangepickerOptions.settings = {
            locale: { format: 'YYYY-MM-DD' },
            alwaysShowCalendars: false
        };
    }
}
```

## Daterangepicker methods

You can programmatically update the `startDate` and `endDate` in the picker using the `setStartDate` and `setEndDate` methods. You can access the Date Range Picker object and its functions and properties through the `datePicker` property of the directive using `@ViewChild`.

``` javascript
import { Component, AfterViewInit, ViewChild  } from '@angular/core';
import { DaterangePickerComponent } from 'ng2-daterangepicker';

@Component({
    selector:'my-app',
    template:'<h3>Component Template</h3>'
})
export class AppComponent {

    @ViewChild(DaterangePickerComponent)
    private picker: DaterangePickerComponent;

    public updateDateRange() {
        this.picker.datePicker.setStartDate('2017-03-27');
        this.picker.datePicker.setEndDate('2017-04-08');
    }
}
```

## Using Daterangepicker Events

You can bind to the events fired by the daterangepicker. All events will emit an object containing the event fired and the datepicker object.

```
{
    event: {},
    picker: {}
}
```

#### Available events

Below is the list of events that you can bind into.

Visit the original site for detailed options and documentation http://www.daterangepicker.com/#options

```
cancelDaterangepicker
applyDaterangepicker
hideCalendarDaterangepicker
showCalendarDaterangepicker
hideDaterangepicker
showDaterangepicker
```

Below is a sample usage. You can have multiple methods and implement only the events you want.

Create methods that will be called by the events in your component and bind to fired events in the component's template.

``` javascript
@Component({
    selector: 'my-app',
    template: `<input type="text" name="daterangeInput" daterangepicker [options]="options" (selected)="selectedDate($event)"
    (cancelDaterangepicker)="calendarCanceled($event)"
    (applyDaterangepicker)="calendarApplied($event)"
    />`,
})
export class AppComponent {

    public daterange: any = {};

    private selectedDate(value: any) {
        daterange.start = value.start;
        daterange.end = value.end;
    }

    // expected output is an object containing the event and the picker.
    // your method can be named whaterver you want.
    // you can add multiple params to the method and pass them in the template
    public calendarCanceled(e:any) {
        console.log(e);
        // e.event
        // e.picker
    }

    public calendarApplied(e:any) {
        console.log(e);
        // e.event
        // e.picker
    }
}
```

Notes
-----
* This package ports the original [Daterangepicker](http://www.daterangepicker.com) by [Dan Grossman](https://github.com/dangrossman) for use in Angular. The picker source is vendored under `src/lib/vendor/` and has been rewritten in TypeScript with native DOM APIs — jQuery is no longer required. Moment.js is still used for date math.
* Angular 9 support starts with `Version 3.x` of this package.

Contributing
------------

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build Development

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Build Package

Run `ng build ng2-daterangepicker` to build the project. The build artifacts will be stored in the `dist/` directory.

## Publishing

After building your library with `ng build ng2-daterangepicker`, go to the dist folder `cd dist/ng2-daterangepicker` and run `npm publish`.

## Running unit tests

Run `ng test ng2-daterangepicker` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
