import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import InspectionFormPage from "./InspectionFormPage";
import { POINTS } from "@/lib/checklist";
import type { Inspection } from "@/types/api";
const vehicles = [
  {
    id: 1,
    plate_number: "B 1001 LQ",
    brand: "Honda",
    model: "Brio",
    year: 2021,
  },
];
const draft: Inspection = {
  id: 7,
  vehicle_id: 1,
  inspector_name: "Rina",
  has_key: true,
  status: "DRAFT",
  version: 1,
  items: [],
};
let record: Inspection;
let mutation: (url: string, body: Record<string, unknown>) => Response;
const json = (data: unknown, status = 200) =>
  new Response(
    JSON.stringify(
      status >= 400 ? data : { success: true, message: "OK", data },
    ),
    { status, headers: { "Content-Type": "application/json" } },
  );
const requestMock = vi.fn();
beforeEach(() => {
  record = structuredClone(draft);
  mutation = () => json(record);
  requestMock.mockReset();
  requestMock.mockImplementation(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (!init?.method || init.method === "GET")
        return json(url.endsWith("/vehicles") ? vehicles : record);
      return mutation(url, JSON.parse(init.body as string));
    },
  );
  vi.stubGlobal("fetch", requestMock);
});
function page(path = "/inspections/new") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/inspections/new" element={<InspectionFormPage />} />
        <Route path="/inspections/:id" element={<InspectionFormPage />} />
      </Routes>
    </MemoryRouter>,
  );
}
async function chooseVehicle(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("combobox", { name: /Kendaraan/ }));
  await user.click(await screen.findByRole("option", { name: /B 1001/ }));
}
async function chooseCondition(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  condition: string,
) {
  await user.click(
    within(
      screen.getByRole("radiogroup", { name: `Kondisi ${label}` }),
    ).getByRole("radio", { name: condition }),
  );
}
describe("Form enterprise", () => {
  it("create tampil, progress awal 0/14, dan memakai route wajib", async () => {
    page();
    await screen.findByLabelText(/Nama inspektur/);
    expect(
      screen.getByRole("heading", { name: "Inspeksi kendaraan" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("progress-global")).toHaveTextContent("0/14");
    expect(screen.getByRole("button", { name: "Simpan Draft" })).toBeEnabled();
  });
  it("Save Draft parsial memakai E2 dan tidak melakukan transition", async () => {
    const user = userEvent.setup();
    page();
    await chooseVehicle(user);
    await user.type(screen.getByLabelText(/Nama inspektur/), "Sari");
    await chooseCondition(user, "Depan", "Baik");
    mutation = (_url, body) => {
      expect(body.items).toHaveLength(1);
      expect(body).not.toHaveProperty("status");
      return json({ ...draft, inspector_name: "Sari", items: body.items });
    };
    await user.click(screen.getByRole("button", { name: "Simpan Draft" }));
    await waitFor(() =>
      expect(
        requestMock.mock.calls.some(([, init]) => init?.method === "POST"),
      ).toBe(true),
    );
    expect(
      requestMock.mock.calls.some(([url]) =>
        String(url).includes("/transition"),
      ),
    ).toBe(false);
  });
  it("Submit tidak lengkap menampilkan summary dan fokus ke radio pertama", async () => {
    const user = userEvent.setup();
    page("/inspections/7");
    await screen.findByLabelText(/Nama inspektur/);
    await user.click(screen.getByRole("button", { name: "Submit" }));
    await screen.findByText("Periksa 14 kolom sebelum melanjutkan");
    await waitFor(() =>
      expect(
        within(
          screen.getByRole("radiogroup", { name: "Kondisi Depan" }),
        ).getByRole("radio", { name: "Baik" }),
      ).toHaveFocus(),
    );
    expect(requestMock.mock.calls.some(([, i]) => i?.method === "POST")).toBe(
      false,
    );
  });
  it("error note membuka Accordion tertutup, scroll dan fokus setelah mount", async () => {
    record.items = [
      {
        point_code: "ENG_BAY",
        condition: "NOT_INSPECTABLE",
        note: "",
        photo_refs: [],
      },
    ];
    const user = userEvent.setup();
    page("/inspections/7");
    await screen.findByLabelText(/Nama inspektur/);
    expect(
      screen.queryByLabelText(/Catatan Ruang mesin/),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Simpan Draft" }));
    const note = await screen.findByLabelText(/Catatan Ruang mesin/);
    await waitFor(() => expect(note).toHaveFocus());
    expect(note).toHaveAttribute("aria-invalid", "true");
    expect(note.getAttribute("aria-describedby")).toContain("-error");
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });
  it("MAJOR_DAMAGE memerlukan foto dan progress berubah setelah foto diisi", async () => {
    const user = userEvent.setup();
    page("/inspections/7");
    await screen.findByLabelText(/Nama inspektur/);
    await chooseCondition(user, "Depan", "Kerusakan besar");
    await user.click(screen.getByRole("button", { name: "Simpan Draft" }));
    expect(
      await screen.findAllByText(
        "Tambahkan minimal satu referensi foto untuk kerusakan besar.",
      ),
    ).not.toHaveLength(0);
    const card = screen.getByTestId("point-EXT_FRONT");
    await user.click(
      within(card).getByRole("button", { name: "Tambah referensi foto" }),
    );
    await user.click(screen.getByRole("button", { name: "Simpan Draft" }));
    await waitFor(() =>
      expect(within(card).getByLabelText("Foto Depan 1")).toHaveFocus(),
    );
    expect(within(card).getByLabelText("Foto Depan 1")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await user.type(within(card).getByLabelText("Foto Depan 1"), "depan.jpg");
    expect(screen.getByTestId("progress-global")).toHaveTextContent("1/14");
  });
  it("400 backend dipetakan berdasarkan point_code dan fokus urutan visual", async () => {
    const user = userEvent.setup();
    mutation = () =>
      json(
        {
          success: false,
          message: "Validation failed",
          errors: [
            { field: "items.ENG_BAY.note", reason: "Catatan server wajib" },
            { field: "inspector_name", reason: "Nama server invalid" },
          ],
        },
        400,
      );
    page("/inspections/7");
    await screen.findByLabelText(/Nama inspektur/);
    await user.click(screen.getByRole("button", { name: "Simpan Draft" }));
    await screen.findAllByText("Nama server invalid");
    await waitFor(() =>
      expect(screen.getByLabelText(/Nama inspektur/)).toHaveFocus(),
    );
    await user.click(
      screen.getByRole("button", { name: /Ruang mesin · Catatan/ }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText(/Catatan Ruang mesin/)).toHaveFocus(),
    );
  });
  it("409 mempertahankan perubahan, memblokir overwrite dan refresh perlu konfirmasi", async () => {
    const user = userEvent.setup();
    mutation = () =>
      json(
        {
          success: false,
          message: "Stale version",
          errors: [{ field: "version", reason: "Stale version" }],
        },
        409,
      );
    page("/inspections/7");
    const name = await screen.findByLabelText(/Nama inspektur/);
    await user.clear(name);
    await user.type(name, "Perubahan lokal");
    await user.click(screen.getByRole("button", { name: "Simpan Draft" }));
    await screen.findByText("Konflik versi data");
    expect(name).toHaveValue("Perubahan lokal");
    expect(screen.getByRole("button", { name: "Simpan Draft" })).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: "Tinjau versi server" }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Kembali" }));
    expect(name).toHaveValue("Perubahan lokal");
  });
  it.each(["APPROVED", "SUBMITTED"] as const)(
    "%s hanya baca",
    async (status) => {
      record = {
        ...draft,
        status,
        items: POINTS.map((p) => ({
          point_code: p.point_code,
          condition: "GOOD",
          note: null,
          photo_refs: [],
        })),
      };
      page("/inspections/7");
      expect(await screen.findByLabelText(/Nama inspektur/)).toHaveAttribute(
        "readonly",
      );
      expect(
        screen.getByRole("button", { name: "Simpan Draft" }),
      ).toBeDisabled();
      expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    },
  );
  it("toggle kunci reversible dan tidak mengarang note mesin", async () => {
    const user = userEvent.setup();
    page("/inspections/7");
    await screen.findByLabelText(/Nama inspektur/);
    await user.click(
      screen.getByRole("switch", { name: "Kunci kendaraan tersedia" }),
    );
    await user.click(screen.getByRole("button", { name: "Bagian Mesin" }));
    const group = screen.getByRole("radiogroup", {
      name: "Kondisi Mesin menyala",
    });
    expect(
      within(group).getByRole("radio", { name: "Tidak dapat diperiksa" }),
    ).toBeChecked();
    expect(screen.getByLabelText(/Catatan Mesin menyala/)).toHaveValue("");
    await user.click(
      screen.getByRole("switch", { name: "Kunci kendaraan tersedia" }),
    );
    expect(
      within(group)
        .getAllByRole("radio")
        .every((r) => r.getAttribute("aria-checked") === "false"),
    ).toBe(true);
  });
  it("404 menampilkan state tidak ditemukan", async () => {
    requestMock.mockImplementation(async (input) =>
      String(input).endsWith("/vehicles")
        ? json(vehicles)
        : json({ success: false, message: "Not found", errors: [] }, 404),
    );
    page("/inspections/404");
    expect(
      await screen.findByRole("heading", { name: "Inspeksi tidak ditemukan" }),
    ).toBeInTheDocument();
  });
});
