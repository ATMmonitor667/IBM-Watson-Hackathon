import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { DataSourceBadge } from "@/components/workspace/DataSourceBadge";
import { useProjectStore } from "@/store/projectStore";

/**
 * The visible half of issue #24 / A5. A console warning is invisible while
 * recording; the badge is the part that stops someone narrating "this is
 * coming from Postgres" over demo data.
 */

beforeEach(() => {
  useProjectStore.setState({
    projects: [],
    isLoading: false,
    error: null,
    dataSource: "mock",
    mockReason: null,
  });
});

describe("DataSourceBadge", () => {
  it("says Demo data when the store fell back", () => {
    useProjectStore.setState({
      dataSource: "mock",
      mockReason: "no-credentials",
    });

    render(<DataSourceBadge />);
    expect(screen.getByText("Demo data")).toBeInTheDocument();
  });

  it("gives the reason to screen readers, not just on hover", () => {
    useProjectStore.setState({
      dataSource: "mock",
      mockReason: "not-signed-in",
    });

    render(<DataSourceBadge />);
    expect(screen.getByRole("status")).toHaveTextContent(/sign in/i);
  });

  it("says Live data only when reading real rows", () => {
    useProjectStore.setState({ dataSource: "supabase", mockReason: null });

    render(<DataSourceBadge />);
    expect(screen.getByText("Live data")).toBeInTheDocument();
    expect(screen.queryByText("Demo data")).not.toBeInTheDocument();
  });

  it("does not shout when the data is real — no status role", () => {
    useProjectStore.setState({ dataSource: "supabase", mockReason: null });

    render(<DataSourceBadge />);
    // Only the degraded state is announced; a healthy app should be quiet.
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("falls back to a generic explanation if the reason is missing", () => {
    useProjectStore.setState({ dataSource: "mock", mockReason: null });

    render(<DataSourceBadge />);
    expect(screen.getByRole("status")).toHaveTextContent(/demo data/i);
  });
});
