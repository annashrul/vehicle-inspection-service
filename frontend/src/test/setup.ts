import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup, configure } from "@testing-library/react";
configure({ asyncUtilTimeout: 3000 });
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock;
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }),
});
beforeEach(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
HTMLElement.prototype.hasPointerCapture = () => false;
HTMLElement.prototype.setPointerCapture = () => {};
HTMLElement.prototype.releasePointerCapture = () => {};
HTMLElement.prototype.getClientRects = function () {
  return this.isConnected && !this.closest("[hidden]")
    ? ([new DOMRect(0, 0, 100, 48)] as unknown as DOMRectList)
    : ([] as unknown as DOMRectList);
};
if (!window.PointerEvent)
  window.PointerEvent = MouseEvent as typeof PointerEvent;
