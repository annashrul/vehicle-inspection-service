import { test, expect } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const swPath = resolve("dist/sw.js");
async function controlled(page: import("@playwright/test").Page) {
  await page.goto("/inspections/new");
  await expect(
    page.getByRole("textbox", { name: "Nama inspektur", exact: true }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
}
test("manifest, ikon PNG aktual dan service worker aktif", async ({
  page,
  request,
}) => {
  await controlled(page);
  const manifestUrl = await page
    .locator("link[rel=manifest]")
    .getAttribute("href");
  expect(manifestUrl).toBeTruthy();
  const response = await request.get(manifestUrl!);
  expect(response.status()).toBe(200);
  const manifest = await response.json();
  expect(manifest).toMatchObject({
    display: "standalone",
    start_url: "/inspections/new",
    lang: "id",
  });
  for (const size of [192, 512]) {
    const icon = manifest.icons.find(
      (i: { sizes: string; purpose: string }) =>
        i.sizes === `${size}x${size}` && i.purpose === "any",
    );
    expect(icon).toBeTruthy();
    const png = await request.get(icon.src);
    expect(png.status()).toBe(200);
    const buffer = await png.body();
    expect(buffer.subarray(1, 4).toString()).toBe("PNG");
    expect(buffer.readUInt32BE(16)).toBe(size);
    expect(buffer.readUInt32BE(20)).toBe(size);
  }
  await page
    .getByRole("button", { name: "Pasang aplikasi", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText("Tambah ke Layar Utama");
  await page.getByRole("button", { name: "Mengerti" }).click();
});
test("offline application shell tersedia; respons dan mutasi API tidak di-cache", async ({
  page,
  context,
}) => {
  await controlled(page);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("status").filter({ hasText: "Offline" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Data belum dapat dimuat" }),
  ).toBeVisible();
  const urls = await page.evaluate(async () => {
    const result: string[] = [];
    for (const key of await caches.keys()) {
      for (const entry of await (await caches.open(key)).keys())
        result.push(entry.url);
    }
    return result;
  });
  expect(urls.length).toBeGreaterThan(0);
  expect(
    urls.some((url) => url.includes("/api/v1") || url.includes(":8080")),
  ).toBe(false);
  await context.setOffline(false);
  await page.getByRole("button", { name: "Coba lagi", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Nama inspektur", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Online" }),
  ).toBeVisible();
});
test("pembaruan nyata menunggu persetujuan dan melindungi form yang belum disimpan", async ({
  page,
}) => {
  test.setTimeout(90000);
  const original = await readFile(swPath, "utf8");
  try {
    await controlled(page);
    await page
      .getByRole("textbox", { name: "Nama inspektur", exact: true })
      .fill("Perubahan belum disimpan");
    await writeFile(
      swPath,
      original + `\n// browser-update-test-${Date.now()}\n`,
    );
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg!.update();
    });
    await expect(
      page.getByText("Versi baru aplikasi tersedia.", { exact: true }),
    ).toBeVisible({ timeout: 30000 });
    await page.getByRole("button", { name: "Tinjau", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText(
      "Masih ada perubahan yang belum disimpan",
    );
    await expect(
      page.getByRole("button", { name: "Perbarui sekarang", exact: true }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Nanti", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Nama inspektur", exact: true })
      .fill("");
    await page
      .locator(".desktop-sidebar")
      .getByRole("button", { name: "Versi baru tersedia", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Perbarui sekarang", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Perbarui sekarang", exact: true })
      .click();
    await expect(
      page.getByRole("textbox", { name: "Nama inspektur", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Nama inspektur", exact: true }),
    ).toHaveValue("");
  } finally {
    await writeFile(swPath, original);
  }
});

test("form di memori tetap utuh saat offline dan tidak dikirim otomatis saat kembali online", async ({
  page,
  context,
}) => {
  await controlled(page);
  let writes = 0;
  page.on("request", (request) => {
    if (
      ["POST", "PUT"].includes(request.method()) &&
      request.url().includes("/api/v1")
    )
      writes++;
  });
  const name = page.getByRole("textbox", {
    name: "Nama inspektur",
    exact: true,
  });
  await name.fill("Catatan lokal di memori");
  await context.setOffline(true);
  await expect(
    page.getByRole("button", { name: "Simpan Draft", exact: true }),
  ).toBeDisabled();
  await expect(name).toHaveValue("Catatan lokal di memori");
  await expect(
    page.getByText("Anda sedang offline", { exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
  await expect(
    page.getByRole("button", { name: "Simpan Draft", exact: true }),
  ).toBeEnabled();
  await expect(name).toHaveValue("Catatan lokal di memori");
  expect(writes).toBe(0);
});
test("aktivasi versi baru dari tab lain tidak menghapus perubahan tab aktif", async ({
  page,
  context,
}) => {
  const original = await readFile(swPath, "utf8");
  try {
    await controlled(page);
    await page
      .getByRole("textbox", { name: "Nama inspektur", exact: true })
      .fill("Jangan hilangkan perubahan tab A");
    const other = await context.newPage();
    await controlled(other);
    await writeFile(swPath, original + `\n// multi-tab-update-${Date.now()}\n`);
    await other.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration())!.update();
    });
    await expect(
      other.getByText("Versi baru aplikasi tersedia.", { exact: true }),
    ).toBeVisible({ timeout: 30000 });
    await other.getByRole("button", { name: "Tinjau", exact: true }).click();
    await other
      .getByRole("button", { name: "Perbarui sekarang", exact: true })
      .click();
    await expect(
      other.getByRole("textbox", { name: "Nama inspektur", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Nama inspektur", exact: true }),
    ).toHaveValue("Jangan hilangkan perubahan tab A");
    await expect(
      page
        .locator(".desktop-sidebar")
        .getByRole("button", { name: "Versi baru tersedia", exact: true }),
    ).toBeVisible();
  } finally {
    await writeFile(swPath, original);
  }
});
