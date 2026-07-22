import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("introduces the Storyverse product", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: /explore every possible world/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/collaborative visual-storytelling workspace/i)).toBeInTheDocument();
  });
});
