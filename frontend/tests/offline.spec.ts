import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const checklist = JSON.parse(readFileSync(new URL("../../checklist.json", import.meta.url), "utf8")) as {
  vehicle_types: { CAR: { section: string; point_code: string }[] };
};

for (const outcome of ["CREATED", "UPDATED", "CONFLICT", "REJECTED", "retry"] as const) {
  test(`submit offline bertahan setelah reload dan sync ${outcome}`, async ({ page, context }) => {
    let calls = 0;
    let firstPayload: unknown;
    let synced: Record<string, unknown> = {};
    await page.route("**/api/v1/**", async (route) => {
      if (route.request().url().endsWith("/vehicles")) {
        await route.fulfill({ json: { success: true, data: [{ id: 1, plate_number: "B OFFLINE", brand: "Honda", model: "Brio", year: 2021 }] } });
        return;
      }
      if (route.request().method() === "GET") {
        await route.fulfill({ json: { success: true, data: Object.keys(synced).length ? synced : {
          id: 999, client_id: "a2a0b21b-4a65-4401-a56b-35f522c2bcd3", version: 3,
          vehicle_id: 1, inspector_name: "Offline tester", has_key: true, status: "DRAFT", items: [],
        } } });
        return;
      }
      expect(route.request().url()).toContain("/inspections/sync");
      const body = route.request().postDataJSON();
      calls++;
      if (outcome === "retry" && calls === 1) {
        firstPayload = body;
        await route.abort();
        return;
      }
      if (firstPayload) expect(body).toEqual(firstPayload);
      expect(body.inspections[0]).toMatchObject({ status: "SUBMITTED", base_version: outcome === "UPDATED" ? 3 : null });
      if (outcome === "UPDATED") expect(body.inspections[0].client_id).toBe("a2a0b21b-4a65-4401-a56b-35f522c2bcd3");
      expect(body.inspections[0].items).toHaveLength(14);
      synced = { ...body.inspections[0], id: 999, version: 1 };
      await route.fulfill({ json: { success: true, data: { results: [{
        client_id: body.inspections[0].client_id,
        result: outcome === "retry" ? "DUPLICATE" : outcome,
        inspection_id: 999, server_version: 1,
        errors: [{ field: "base_version", reason: "test conflict" }],
      }] } } });
    });
    await page.goto(outcome === "UPDATED" ? "/inspections/999" : "/inspections/new");
    await page.getByRole("textbox", { name: "Nama inspektur", exact: true }).fill("Offline tester");
    if (outcome !== "UPDATED") {
      await page.getByRole("combobox", { name: /Kendaraan/ }).click();
      await page.getByRole("option", { name: /B OFFLINE/ }).click();
    }
    for (const section of ["EXTERIOR", "INTERIOR", "ENGINE"]) {
      const label = { EXTERIOR: "Eksterior", INTERIOR: "Interior", ENGINE: "Mesin" }[section]!;
      if (section !== "EXTERIOR") await page.getByRole("button", { name: `Bagian ${label}`, exact: true }).click();
      for (const point of checklist.vehicle_types.CAR.filter((p) => p.section === section)) {
        await page.getByTestId(`point-${point.point_code}`).getByRole("radio", { name: "Baik", exact: true }).click();
      }
    }
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await context.setOffline(true);
    await page.getByRole("button", { name: "Submit", exact: true }).click();
    await page.getByRole("button", { name: "Ya, ajukan inspeksi" }).click();
    await expect(page.getByRole("complementary", { name: "Antrean sinkronisasi" })).toContainText("menunggu sinkronisasi");
    if (outcome !== "UPDATED") await expect(page).toHaveURL(/local-/);
    expect(calls).toBe(0);
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Nama inspektur", exact: true })).toHaveValue("Offline tester");
    await context.setOffline(false);
    if (outcome === "retry") {
      await expect.poll(() => calls).toBe(1);
      await page.evaluate(() => window.dispatchEvent(new Event("online")));
    }
    if (outcome === "CREATED" || outcome === "UPDATED" || outcome === "retry") {
      await expect(page.getByRole("complementary", { name: "Antrean sinkronisasi" })).toHaveCount(0);
      await expect(page.getByRole("textbox", { name: "Nama inspektur", exact: true })).toHaveValue("Offline tester");
    } else {
      await expect(page.getByRole("complementary", { name: "Antrean sinkronisasi" })).toContainText(outcome === "CONFLICT" ? "Konflik versi server" : "Ditolak server");
    }
    expect(calls).toBe(outcome === "retry" ? 2 : 1);
  });
}
