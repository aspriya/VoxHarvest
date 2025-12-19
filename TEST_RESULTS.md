# Test Suite Verification

## Test Results
Run `npx vitest run` to verify all tests.

**Summary:**
-   **SettingsPage:** 2/2 Passed
-   **Dashboard:** 2/2 Passed
-   **GeneratorModal:** 2/2 Passed (Simple and Advanced Modes)
-   **ProjectPage:** 3/3 Passed (Load, Extend Script, Export)
-   **Total:** 9/9 Tests Passed.

## Key Fixes & Implementation Details
1.  **Mocking strategy:**
    -   Implemented a robust manual mock for `window.AudioContext` in `src/tests/setup.ts` to satisfy `AudioVisualizer` requirements.
    -   Explicitly mocked the `tone` module to bypass complex Web Audio API interactions that are difficult to simulate in JSDOM.
    -   Mocked Electron IPC (`window.api`) and standard browser APIs (`ResizeObserver`, `scrollIntoView`, `confirm`).

2.  **Component Tests:**
    -   **GeneratorModal:** Verified simple and advanced generation flows. Fixed accessibility issues by adding proper `id` and `htmlFor` attributes to inputs and labels.
    -   **ProjectPage:** Verified project loading, script extension, and export functionality. Addressed "multiple elements found" errors by using specific selectors (`getAllByText`).

3.  **Setup:**
    -   Use `src/tests/setup.ts` to configure the global test environment.
    -   Tests run with `vitest` in a `jsdom` environment.
