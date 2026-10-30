import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const checklist = JSON.parse(readFileSync(new URL("../../checklist.json", import.meta.url), "utf8")) as {
  vehicle_types: { CAR: { point_code: string; section: string; label: string }[] };
};
const queue = (page: Page) => page.getByRole("complementary", { name: "Antrean sinkronisasi" });
async function ready(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole("textbox", { name: "Nama inspektur", exact: true })).toBeVisible();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
}
async function complete(page: Page) {
  await page.getByRole("combobox", { name: /Kendaraan/ }).click();
  await page.getByRole("option", { name: /B 1001 LQ/ }).click();
  await page.getByRole("textbox", { name: "Nama inspektur", exact: true }).fill("Offline integration");
  for (const section of ["EXTERIOR", "INTERIOR", "ENGINE"]) {
    const label = { EXTERIOR: "Eksterior", INTERIOR: "Interior", ENGINE: "Mesin" }[section]!;
    if (section !== "EXTERIOR") await page.getByRole("button", { name: `Bagian ${label}`, exact: true }).click();
    for (const point of checklist.vehicle_types.CAR.filter((p) => p.section === section))
      await page.getByTestId(`point-${point.point_code}`).getByRole("radio", { name: "Baik", exact: true }).click();
  }
}
test("backend nyata: submit offline, respons hilang, retry DUPLICATE tanpa audit ganda", async ({ page, context, request }) => {
  let calls = 0, id = 0, outcome = "";
  let original: unknown;
  await page.route("**/api/v1/inspections/sync", async (route) => {
    const payload = route.request().postDataJSON();
    if (original) expect(payload).toEqual(original);
    else original = payload;
    const response = await route.fetch();
    const body = await response.json();
    id = body.data.results[0].inspection_id;
    outcome = body.data.results[0].result;
    calls++;
    if (calls === 1) {
      expect(outcome).toBe("CREATED");
      await route.abort(); // The server committed; the browser lost its acknowledgement.
    } else await route.fulfill({ response });
  });
  await ready(page, "/inspections/new");
  await complete(page);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page.getByRole("button", { name: "Ya, ajukan inspeksi" }).click();
  await expect(queue(page)).toContainText("menunggu sinkronisasi");
  await expect(page).toHaveURL(/local-/);
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Nama inspektur", exact: true })).toHaveValue("Offline integration");
  await context.setOffline(false);
  await expect(queue(page)).toContainText("Konfirmasi server belum diterima");
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(queue(page)).toHaveCount(0);
  expect(calls).toBe(2);
  expect(outcome).toBe("DUPLICATE");
  const detail = await (await request.get(`http://localhost:8080/api/v1/inspections/${id}`)).json();
  expect(detail.data).toMatchObject({ status: "SUBMITTED", version: 1 });
  expect(detail.data.items).toHaveLength(14);
  const audit = await (await request.get(`http://localhost:8080/api/v1/inspections/${id}/audit`)).json();
  expect(audit.data.map((event: { action: string }) => event.action)).toEqual(["SYNC_CREATED"]);
});
for (const conflict of [false, true]) {
  test(`backend nyata: draft E2 offline ${conflict ? "CONFLICT menjaga data lokal" : "UPDATED mempertahankan UUID dan id"}`, async ({ page, context, request }) => {
    const created = await request.post("http://localhost:8080/api/v1/inspections", {
      data: { vehicle_id: 1, inspector_name: "Draft online", has_key: true, items: [] },
    });
    expect(created.status()).toBe(201);
    const { data: initial } = await created.json();
    expect(initial.client_id).toMatch(/^[0-9a-f-]{36}$/);
    await ready(page, `/inspections/${initial.id}`);
    await context.setOffline(true);
    await page.getByRole("textbox", { name: "Nama inspektur", exact: true }).fill("Perubahan offline");
    await page.getByRole("button", { name: "Simpan Draft", exact: true }).click();
    await expect(queue(page)).toContainText("menunggu sinkronisasi");
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Nama inspektur", exact: true })).toHaveValue("Perubahan offline");
    if (conflict) {
      const update = await request.put(`http://localhost:8080/api/v1/inspections/${initial.id}`, {
        data: { version: 1, inspector_name: "Perubahan supervisor", has_key: true, items: [] },
      });
      expect(update.status()).toBe(200);
    }
    await context.setOffline(false);
    if (conflict) {
      await expect(queue(page)).toContainText("Konflik versi server");
      await expect(page.getByRole("textbox", { name: "Nama inspektur", exact: true })).toHaveValue("Perubahan offline");
    } else await expect(queue(page)).toHaveCount(0);
    const detail = await (await request.get(`http://localhost:8080/api/v1/inspections/${initial.id}`)).json();
    expect(detail.data).toMatchObject({ id: initial.id, client_id: initial.client_id, version: 2,
      inspector_name: conflict ? "Perubahan supervisor" : "Perubahan offline" });
  });
}
