import { test, expect } from "@playwright/test";
import checklist from "../../checklist.json" with { type: "json" };
const sizes = [
  { width: 320, height: 760 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 820, height: 1180 },
  { width: 1024, height: 768 },
  { width: 1280, height: 900 },
  { width: 1440, height: 960 },
  { width: 1920, height: 1080 },
];
async function vehicle(page: import("@playwright/test").Page) {
  await page.getByRole("combobox", { name: /Kendaraan/ }).click();
  await page.getByRole("option", { name: /B 1001 LQ/ }).click();
}
async function noOverflow(page: import("@playwright/test").Page) {
  expect(
    await page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
    })),
  ).toEqual(expect.objectContaining({ viewport: expect.any(Number) }));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
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
for (const size of sizes)
  test(`adaptif ${size.width}px: layout, partial draft, focus Accordion dan overflow`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize(size);
    await page.goto("/inspections/new");
    await expect(
      page.getByRole("textbox", { name: "Nama inspektur", exact: true }),
    ).toBeVisible();
    await noOverflow(page);
    await expect(
      page.locator(
        size.width >= 1200 ? ".desktop-sidebar" : ".mobile-progress",
      ),
    ).toBeVisible();
    await expect(
      page.locator(
        size.width >= 1200 ? ".mobile-progress" : ".desktop-sidebar",
      ),
    ).not.toBeVisible();
    await vehicle(page);
    await page
      .getByRole("textbox", { name: "Nama inspektur", exact: true })
      .fill("Uji layout tanpa menyimpan");
    await page
      .getByRole("switch", { name: "Kunci kendaraan tersedia" })
      .click();
    await expect(
      page.getByRole("textbox", { name: "Catatan Mesin menyala", exact: true }),
    ).not.toBeVisible();
    await page
      .getByRole("button", { name: "Simpan Draft", exact: true })
      .click();
    const note = page.getByRole("textbox", {
      name: "Catatan Mesin menyala",
      exact: true,
    });
    await expect(note).toBeVisible();
    await expect(note).toBeFocused();
    await expect(note).toHaveAttribute("aria-invalid", "true");
    await expect(note).toHaveAttribute("aria-describedby", /-error/);

    await expect
      .poll(async () => {
        const box = await note.boundingBox();
        const top = await page
          .locator(size.width >= 1200 ? ".app-header" : ".mobile-progress")
          .boundingBox();
        const bottom = await page.getByTestId("action-bar").boundingBox();
        return (
          !!box &&
          !!top &&
          box.y >= top.y + top.height &&
          (!bottom || box.y + box.height <= bottom.y || size.width >= 1200)
        );
      })
      .toBe(true);
    await noOverflow(page);
    await note.fill("Kunci tidak tersedia saat inspeksi");
    await page
      .getByRole("textbox", { name: "Catatan Ruang mesin", exact: true })
      .fill("Ruang mesin tidak dapat diakses tanpa kunci");
    await expect(
      page.getByTestId(
        size.width >= 1200 ? "progress-global" : "progress-compact",
      ),
    ).toContainText("2/14");
    await expect(
      page.getByText("Ada kolom yang perlu diperbaiki.", { exact: true }),
    ).not.toBeVisible();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({
      path: `../evidence/redesign/viewport-${size.width}.png`,
    });
    expect(errors).toEqual([]);
  });
test("integrasi backend E2/E3/E6: draft parsial, foto, submit dan detail read-only", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const writes: {
    method: string;
    body: Record<string, unknown>;
    url: string;
  }[] = [];
  page.on("request", (r) => {
    if (
      ["POST", "PUT"].includes(r.method()) &&
      r.url().includes("/api/v1/inspections")
    )
      writes.push({ method: r.method(), body: r.postDataJSON(), url: r.url() });
  });
  await page.goto("/inspections/new");
  await vehicle(page);
  await page
    .getByRole("textbox", { name: "Nama inspektur", exact: true })
    .fill("Redesign integration");
  await page
    .getByRole("radiogroup", { name: "Kondisi Depan", exact: true })
    .getByRole("radio", { name: "Baik", exact: true })
    .click();
  await page.getByRole("button", { name: "Simpan Draft", exact: true }).click();
  await expect(page).toHaveURL(/\/inspections\/\d+$/);
  const id = Number(page.url().split("/").at(-1));
  await expect(page.locator(".heading-meta")).toContainText("Versi 1");
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Nama inspektur", exact: true }),
  ).toHaveValue("Redesign integration");
  await page
    .getByRole("textbox", { name: "Nama inspektur", exact: true })
    .fill("Redesign integration updated");
  await page.getByRole("button", { name: "Simpan Draft", exact: true }).click();
  await expect(page.locator(".heading-meta")).toContainText("Versi 2");
  for (const section of ["Interior", "Mesin"])
    await page
      .getByRole("button", { name: `Bagian ${section}`, exact: true })
      .click();
  for (const p of checklist.vehicle_types.CAR)
    await page
      .getByRole("radiogroup", { name: `Kondisi ${p.label}`, exact: true })
      .getByRole("radio", { name: "Baik", exact: true })
      .click();
  const front = page.getByTestId("point-EXT_FRONT");
  await front
    .getByRole("radio", { name: "Kerusakan besar", exact: true })
    .click();
  await front
    .getByRole("button", { name: "Tambah referensi foto", exact: true })
    .click();
  await front.getByLabel("Foto Depan 1", { exact: true }).fill("depan.jpg");
  await front
    .getByRole("button", { name: "Tambah referensi foto", exact: true })
    .click();
  await front.getByLabel("Foto Depan 2", { exact: true }).fill("detail.jpg");
  await expect(page.getByTestId("progress-global")).toContainText("14/14");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Ya, ajukan inspeksi", exact: true })
    .click();
  await expect(page.locator(".heading-meta")).toContainText("SUBMITTED");
  await expect(page.locator(".heading-meta")).toContainText("Versi 4");
  expect(writes.map((w) => w.method)).toEqual(["POST", "PUT", "PUT", "POST"]);
  expect(writes[0].body.items).toHaveLength(1);
  expect(writes[0].body).not.toHaveProperty("status");
  expect(writes[2].body.items).toHaveLength(14);
  expect(writes[3].body).toMatchObject({ to: "SUBMITTED" });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Simpan Draft", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("textbox", { name: "Nama inspektur", exact: true }),
  ).toHaveAttribute("readonly");
  const response = await request.post(
    `http://localhost:8080/api/v1/inspections/${id}/transition`,
    {
      data: {
        to: "APPROVED",
        actor: "Redesign test supervisor",
        note: "Synthetic browser test",
      },
    },
  );
  expect(response.status()).toBe(200);
  await page.reload();
  await expect(page.locator(".heading-meta")).toContainText("APPROVED");
  await expect(
    page.getByRole("button", { name: "Submit", exact: true }),
  ).toBeDisabled();
});
test("409 menjaga input dan memuat data terbaru hanya setelah konfirmasi", async ({
  page,
}) => {
  let version = 1;
  let writes = 0;
  await page.route("**/api/v1/inspections/424242", async (route) => {
    if (route.request().method() === "PUT") {
      writes++;
      version = 2;
      return route.fulfill({
        status: 409,
        json: {
          success: false,
          message: "Stale version",
          errors: [{ field: "version", reason: "Stale version" }],
        },
      });
    }
    return route.fulfill({
      json: {
        success: true,
        message: "OK",
        data: {
          id: 424242,
          vehicle_id: 1,
          inspector_name: version === 1 ? "Data awal" : "Data terbaru server",
          has_key: true,
          status: "DRAFT",
          version,
          items: [],
        },
      },
    });
  });
  await page.goto("/inspections/424242");
  const name = page.getByRole("textbox", {
    name: "Nama inspektur",
    exact: true,
  });
  await name.fill("Perubahan lokal belum disimpan");
  await page.getByRole("button", { name: "Simpan Draft", exact: true }).click();
  await expect(page.getByText("Konflik versi data")).toBeVisible();
  await expect(name).toHaveValue("Perubahan lokal belum disimpan");
  await expect(
    page.getByRole("button", { name: "Simpan Draft", exact: true }),
  ).toBeDisabled();
  expect(writes).toBe(1);
  await page
    .getByRole("button", { name: "Tinjau versi server", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Muat versi server", exact: true })
    .click();
  await expect(name).toHaveValue("Data terbaru server");
  await expect(page.locator(".heading-meta")).toContainText("Versi 2");
});
test("keyboard dapat mencapai Select, Switch dan RadioGroup", async ({
  page,
}) => {
  await page.goto("/inspections/new");
  const select = page.getByRole("combobox", { name: /Kendaraan/ });
  await select.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(select).not.toContainText("Pilih kendaraan");
  const key = page.getByRole("switch", { name: "Kunci kendaraan tersedia" });
  await key.focus();
  await page.keyboard.press("Space");
  await expect(key).toHaveAttribute("aria-checked", "false");
  const radio = page
    .getByRole("radiogroup", { name: "Kondisi Depan", exact: true })
    .getByRole("radio", { name: "Baik", exact: true });
  await radio.focus();
  await page.keyboard.press("Space");
  await expect(radio).toBeChecked();
});

test.describe("interaksi sentuh", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  test("Switch dan pilihan kondisi dapat digunakan dengan sentuhan", async ({
    page,
  }) => {
    await page.goto("/inspections/new");
    const key = page.getByRole("switch", { name: "Kunci kendaraan tersedia" });
    await key.tap();
    await expect(key).toHaveAttribute("aria-checked", "false");
    expect((await key.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    const choice = page
      .getByRole("radiogroup", { name: "Kondisi Depan", exact: true })
      .locator("label")
      .first();
    expect((await choice.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await choice.tap();
    await expect(
      page
        .getByRole("radiogroup", { name: "Kondisi Depan", exact: true })
        .getByRole("radio", { name: "Baik", exact: true }),
    ).toBeChecked();
  });
});

test("400 backend membuka Accordion dan memfokuskan error pertama secara visual", async ({
  page,
}) => {
  await page.route("**/api/v1/inspections/424243", (route) =>
    route.request().method() === "PUT"
      ? route.fulfill({
          status: 400,
          json: {
            success: false,
            message: "Validation failed",
            errors: [
              { field: "items.ENG_BAY.note", reason: "Catatan dari server" },
              { field: "inspector_name", reason: "Nama dari server" },
            ],
          },
        })
      : route.fulfill({
          json: {
            success: true,
            message: "OK",
            data: {
              id: 424243,
              vehicle_id: 1,
              inspector_name: "Rina",
              has_key: true,
              status: "DRAFT",
              version: 1,
              items: [],
            },
          },
        }),
  );
  await page.goto("/inspections/424243");
  await page
    .getByRole("textbox", { name: "Nama inspektur", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Simpan Draft", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Nama inspektur", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByText("Periksa 2 kolom sebelum melanjutkan"),
  ).toBeVisible();
  await page.getByRole("button", { name: /Ruang mesin · Catatan/ }).click();
  await expect(
    page.getByRole("textbox", { name: "Catatan Ruang mesin", exact: true }),
  ).toBeFocused();
});
