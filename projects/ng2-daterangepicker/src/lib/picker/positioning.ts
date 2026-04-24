import { offsetTopLeft, outerHeight, outerWidth } from "./dom-utils";
import type { DrpDrops, DrpOpens } from "./types";

export interface PositioningState {
  element: HTMLElement;
  container: HTMLElement;
  parentEl: HTMLElement;
  opens: DrpOpens;
  drops: DrpDrops;
}

/**
 * Recompute the picker container's absolute position relative to the element
 * it is anchored to. Writes the computed top/left/right directly into
 * `container.style` and toggles the `drop-up` class on the container.
 *
 * Behaviour matches the upstream `move()` method 1:1 — the control flow is
 * non-trivial (auto-drop, viewport overflow detection, opens={left,right,center})
 * and upstream changes there are rare, so this is kept as a single function.
 */
export function positionPicker(state: PositioningState): void {
  const { element, container, parentEl } = state;
  let drops = state.drops;

  let parentOffset = { top: 0, left: 0 };
  let parentRightEdge = window.innerWidth;

  if (parentEl !== document.body) {
    const off = offsetTopLeft(parentEl);
    parentOffset = {
      top: off.top - parentEl.scrollTop,
      left: off.left - parentEl.scrollLeft,
    };
    parentRightEdge = parentEl.clientWidth + offsetTopLeft(parentEl).left;
  }

  const elementOff = offsetTopLeft(element);
  const elementOuterHeight = outerHeight(element);
  const elementOuterWidth = outerWidth(element);

  let containerTop: number;
  switch (drops) {
    case "auto":
      containerTop = elementOff.top + elementOuterHeight - parentOffset.top;
      if (
        containerTop + outerHeight(container) >=
        parentEl.scrollHeight
      ) {
        containerTop =
          elementOff.top - outerHeight(container) - parentOffset.top;
        drops = "up";
      }
      break;
    case "up":
      containerTop =
        elementOff.top - outerHeight(container) - parentOffset.top;
      break;
    default:
      containerTop = elementOff.top + elementOuterHeight - parentOffset.top;
  }

  // Force the container to its actual width to measure overflow.
  container.style.top = "0";
  container.style.left = "0";
  container.style.right = "auto";
  const containerWidth = outerWidth(container);

  container.classList.toggle("drop-up", drops === "up");

  if (state.opens === "left") {
    const containerRight =
      parentRightEdge - elementOff.left - elementOuterWidth;
    if (containerWidth + containerRight > window.innerWidth) {
      applyStyle(container, containerTop, 9, "auto");
    } else {
      applyStyle(container, containerTop, "auto", containerRight);
    }
  } else if (state.opens === "center") {
    const containerLeft =
      elementOff.left -
      parentOffset.left +
      elementOuterWidth / 2 -
      containerWidth / 2;
    if (containerLeft < 0) {
      applyStyle(container, containerTop, 9, "auto");
    } else if (containerLeft + containerWidth > window.innerWidth) {
      applyStyle(container, containerTop, "auto", 0);
    } else {
      applyStyle(container, containerTop, containerLeft, "auto");
    }
  } else {
    const containerLeft = elementOff.left - parentOffset.left;
    if (containerLeft + containerWidth > window.innerWidth) {
      applyStyle(container, containerTop, "auto", 0);
    } else {
      applyStyle(container, containerTop, containerLeft, "auto");
    }
  }
}

function applyStyle(
  container: HTMLElement,
  top: number | string,
  left: number | string,
  right: number | string,
): void {
  container.style.top = typeof top === "number" ? top + "px" : top;
  container.style.left = typeof left === "number" ? left + "px" : left;
  container.style.right = typeof right === "number" ? right + "px" : right;
}
