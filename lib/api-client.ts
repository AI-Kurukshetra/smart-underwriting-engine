export async function persistSetting(table: string, action: string, data: Record<string, unknown>) {
  const response = await fetch("/api/v1/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, action, data }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error?.message ?? "Failed to save setting");
  }
  return result;
}

export async function saveReport(name: string, widgets: unknown[]) {
  const response = await fetch("/api/v1/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, widgets }),
  });
  const result = await response.json();
  if (!response.ok && !result.data) {
    throw new Error(result.error?.message ?? "Failed to save report");
  }
  return result;
}

export async function loadSavedReports() {
  const response = await fetch("/api/v1/reports");
  const result = await response.json();
  return result.data ?? [];
}
