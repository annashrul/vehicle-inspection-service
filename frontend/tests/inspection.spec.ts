import { test, expect } from "@playwright/test";
test.beforeAll(async ({ request }) => {
  await expect
    .poll(
      async () => {
        try {
          return (
            await request.get("http://localhost:8080/q/health/ready")
          ).status();
        } catch {
          return 0;
        }
      },
      { timeout: 60000 },
    )
    .toBe(200);
});
for (const width of [1280, 768]) {
  test(`form integration at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/inspections/new");
    await expect(page.getByLabel("Nama inspektur")).toBeVisible();
    await expect(
      page.getByLabel("Kendaraan", { exact: true }).locator("option"),
    ).toHaveCount(20);
    await page.getByRole("button", { name: "Simpan Draft" }).click();
    await expect(page.getByText("Nama inspektur wajib diisi.")).toBeVisible();
    await page.getByLabel("Nama inspektur").fill(`Browser test ${width}`);
    await page.getByLabel("Kunci kendaraan tersedia").uncheck();
    await expect(
      page.getByLabel("Kondisi Mesin menyala", { exact: true }),
    ).toHaveValue("NOT_INSPECTABLE");
    await expect(
      page.getByLabel("Kondisi Ruang mesin", { exact: true }),
    ).toBeDisabled();
    await page
      .getByLabel("Kondisi Depan", { exact: true })
      .selectOption("MAJOR_DAMAGE");
    await page.getByRole("button", { name: "Simpan Draft" }).click();
    await expect(page.getByText("Minimal satu referensi foto.")).toBeVisible();
    await page.getByLabel("Foto Depan", { exact: true }).fill("depan.jpg");
    await page.getByLabel("Foto Depan", { exact: true }).press("End");
    await page.getByLabel("Foto Depan", { exact: true }).pressSequentially(", detail.jpg");
    await expect(page.getByLabel("Foto Depan", { exact: true })).toHaveValue("depan.jpg, detail.jpg");
    await page.getByRole("button", { name: "Simpan Draft" }).click();
    await expect(page).toHaveURL(/\/inspections\/\d+$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Inspeksi #",
    );
    await page.getByLabel("Nama inspektur").fill(`Browser updated ${width}`);
    await page.getByRole("button", { name: "Simpan Draft" }).click();
    await expect(page.locator(".badge")).toContainText("v2");
    await page.getByRole("button", { name: "Submit inspeksi" }).click();
    await expect(page.locator(".badge")).toContainText("SUBMITTED");
    await expect(page.locator(".badge")).toContainText("v4");
    await expect(
      page.getByRole("button", { name: "Simpan Draft" }),
    ).toBeDisabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `../evidence/frontend-${width}.png`,
      fullPage: true,
    });
    await page.reload();
    await expect(page.locator(".badge")).toContainText("SUBMITTED");
    await expect(page.getByLabel("Foto Depan", { exact: true })).toHaveValue(
      "depan.jpg, detail.jpg",
    );
  });
}
test("shows API field errors without losing form", async ({ page }) => {
  await page.goto("/inspections/new");
  await page.getByLabel("Nama inspektur").fill("API errors");
  await page.route("**/api/v1/inspections", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        message: "Validation failed",
        errors: [
          { field: "inspector_name", reason: "Server field validation" },
        ],
      }),
    }),
  );
  await page.getByRole("button", { name: "Simpan Draft" }).click();
  await expect(page.getByText("Server field validation")).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Validation failed");
  await expect(page.getByLabel("Nama inspektur")).toHaveValue("API errors");
});

test("initial API failure offers a working retry", async ({ page }) => {
  await page.route("**/api/v1/vehicles", route => route.fulfill({
    status: 503, contentType: "application/json",
    body: JSON.stringify({ success: false, message: "Service unavailable", errors: [] }),
  }));
  await page.goto("/inspections/new");
  await expect(page.getByRole("button", { name: "Coba lagi" })).toBeVisible();
  await expect(page.getByText("Memuat data inspeksi…")).toHaveCount(0);
  await page.unroute("**/api/v1/vehicles");
  await page.getByRole("button", { name: "Coba lagi" }).click();
  await expect(page.getByLabel("Nama inspektur")).toBeVisible();
});
