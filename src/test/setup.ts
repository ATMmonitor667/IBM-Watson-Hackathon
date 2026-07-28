import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

/**
 * Unmount between tests.
 *
 * Testing Library only auto-cleans when it detects a global `afterEach`, which
 * it does not under Vitest without globals enabled. Without this, every
 * render() stacks into the same document and queries start matching elements
 * left behind by earlier tests — a failure mode that shows up as
 * "found multiple elements" in whichever test happens to run second.
 */
afterEach(cleanup);
