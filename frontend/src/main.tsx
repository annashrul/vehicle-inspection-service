import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import checklist from "./checklist.json";
import { ApiError, useApi } from "./hooks/useApi";
import type {
  Condition,
  FieldError,
  Inspection,
  Item,
  Vehicle,
} from "./types/api";
import "./style.css";
const points = checklist.vehicle_types.CAR;
const labels: Record<Condition, string> = {
  GOOD: "Baik",
  MINOR_DAMAGE: "Kerusakan ringan",
  MAJOR_DAMAGE: "Kerusakan besar",
  NOT_INSPECTABLE: "Tidak dapat diperiksa",
};
function Form() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { request, loading } = useApi();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [vehicle, setVehicle] = useState(1);
  const [name, setName] = useState("");
  const [key, setKey] = useState(true);
  const [items, setItems] = useState<Item[]>(
    points.map((p) => ({
      point_code: p.point_code,
      condition: "GOOD",
      note: null,
      photo_refs: [],
    })),
  );
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [toast, setToast] = useState("");
  const [ready, setReady] = useState(false);
  const editable =
    !inspection || ["DRAFT", "RECHECK"].includes(inspection.status);
  useEffect(() => {
    let active = true;
    setReady(false);
    setErrors([]);
    Promise.all([
      request<Vehicle[]>("/vehicles"),
      id ? request<Inspection>(`/inspections/${id}`) : Promise.resolve(null),
    ])
      .then(([v, i]) => {
        if (!active) return;
        setVehicles(v);
        setInspection(i);
        if (i) {
          setVehicle(i.vehicle_id);
          setName(i.inspector_name);
          setKey(i.has_key);
          setItems(
            points.map(
              (p) =>
                i.items.find((x) => x.point_code === p.point_code) ?? {
                  point_code: p.point_code,
                  condition: "GOOD",
                  note: null,
                  photo_refs: [],
                },
            ),
          );
        }
        setReady(true);
      })
      .catch((e) => {
        if (active) setToast(e.message);
      });
    return () => {
      active = false;
    };
  }, [id, request]);
  const change = (code: string, patch: Partial<Item>) =>
    setItems((old) =>
      old.map((i) => (i.point_code === code ? { ...i, ...patch } : i)),
    );
  function toggleKey(value: boolean) {
    setKey(value);
    if (!value)
      setItems((old) =>
        old.map((i) =>
          points.find((p) => p.point_code === i.point_code)?.section ===
          "ENGINE"
            ? {
                ...i,
                condition: "NOT_INSPECTABLE",
                note: i.note || "Kunci tidak tersedia",
              }
            : i,
        ),
      );
  }
  const fieldErrors = (field: string) =>
    errors
      .filter((e) => e.field === field || e.field.startsWith(field + "."))
      .map((e) => (
        <small className="error" key={e.field + e.reason}>
          {e.reason}
        </small>
      ));
  async function save(submit: boolean) {
    const invalid: FieldError[] = [];
    if (!name.trim())
      invalid.push({
        field: "inspector_name",
        reason: "Nama inspektur wajib diisi.",
      });
    for (const i of items) {
      if (i.condition === "NOT_INSPECTABLE" && !i.note?.trim())
        invalid.push({
          field: `items.${i.point_code}.note`,
          reason: "Catatan wajib diisi.",
        });
      if (i.condition === "MAJOR_DAMAGE" && !i.photo_refs.length)
        invalid.push({
          field: `items.${i.point_code}.photo_refs`,
          reason: "Minimal satu referensi foto.",
        });
    }
    setErrors(invalid);
    if (invalid.length) {
      setToast("Periksa kolom yang ditandai.");
      return;
    }
    try {
      let result = await request<Inspection>(
        inspection ? `/inspections/${inspection.id}` : "/inspections",
        inspection ? "PUT" : "POST",
        {
          vehicle_id: vehicle,
          inspector_name: name,
          has_key: key,
          items,
          ...(inspection ? { version: inspection.version } : {}),
        },
      );
      setInspection(result);
      if (submit) {
        result = await request<Inspection>(
          `/inspections/${result.id}/transition`,
          "POST",
          { to: "SUBMITTED", actor: name, note: null },
        );
        setInspection(result);
      }
      setToast(
        submit ? "Inspeksi berhasil disubmit." : "Draft berhasil disimpan.",
      );
      if (!id) navigate(`/inspections/${result.id}`);
    } catch (e) {
      const error = e as ApiError;
      setErrors(error.errors ?? []);
      setToast(error.message);
    }
  }
  return (
    <>
      <header>
        <a href="/inspections/new" className="brand">
          L<span>●</span>GIQUE
        </a>
        <span>VEHICLE INSPECTION</span>
      </header>
      <main>
        <div className="intro">
          <div>
            <p className="eyebrow">OPERASIONAL / INSPEKSI KENDARAAN</p>
            <h1>{id ? `Inspeksi #${id}` : "Inspeksi baru"}</h1>
            <p>Catat kondisi kendaraan secara lengkap dan akurat.</p>
          </div>
          <div className="badge">
            {inspection?.status ?? "DRAFT"}{" "}
            <span>· v{inspection?.version ?? 1}</span>
          </div>
        </div>
        {toast && (
          <div className="toast" role="status">
            {toast}
            <button aria-label="Tutup pesan" onClick={() => setToast("")}>
              ×
            </button>
          </div>
        )}
        {!ready ? (
          <p role="status">Memuat data inspeksi…</p>
        ) : (
          <>
            <section className="card">
              <h2>
                <b>01</b> Informasi inspeksi
              </h2>
              <div className="details">
                <label>
                  Kendaraan
                  <select
                    aria-label="Kendaraan"
                    value={vehicle}
                    disabled={!!inspection || loading}
                    onChange={(e) => setVehicle(Number(e.target.value))}
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate_number} · {v.brand} {v.model} ({v.year})
                      </option>
                    ))}
                  </select>
                  {fieldErrors("vehicle_id")}
                </label>
                <label>
                  Nama inspektur
                  <input
                    value={name}
                    maxLength={200}
                    disabled={!editable || loading}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama lengkap"
                  />
                  {fieldErrors("inspector_name")}
                </label>
                <label className="key">
                  <input
                    type="checkbox"
                    checked={key}
                    disabled={!editable || loading}
                    onChange={(e) => toggleKey(e.target.checked)}
                  />{" "}
                  Kunci kendaraan tersedia
                </label>
              </div>
            </section>
            {checklist.sections.map((section, index) => (
              <section className="card" key={section}>
                <h2>
                  <b>0{index + 2}</b>{" "}
                  {
                    {
                      EXTERIOR: "Eksterior",
                      INTERIOR: "Interior",
                      ENGINE: "Mesin",
                    }[section]
                  }
                  <span>
                    {points.filter((p) => p.section === section).length} titik
                    pemeriksaan
                  </span>
                </h2>
                <div className="point-head">
                  <span>TITIK PEMERIKSAAN</span>
                  <span>KONDISI</span>
                  <span>CATATAN & FOTO</span>
                </div>
                {points
                  .filter((p) => p.section === section)
                  .map((p) => {
                    const item = items.find(
                      (i) => i.point_code === p.point_code,
                    )!;
                    return (
                      <div className="point" key={p.point_code}>
                        <div>
                          <strong>{p.label}</strong>
                          <small>{p.point_code}</small>
                        </div>
                        <label>
                          <span className="sr-only">Kondisi {p.label}</span>
                          <select
                            aria-label={`Kondisi ${p.label}`}
                            value={item.condition}
                            disabled={
                              !editable ||
                              loading ||
                              (!key && section === "ENGINE")
                            }
                            onChange={(e) =>
                              change(p.point_code, {
                                condition: e.target.value as Condition,
                              })
                            }
                          >
                            {Object.entries(labels).map(([v, l]) => (
                              <option key={v} value={v}>
                                {l}
                              </option>
                            ))}
                          </select>
                          {fieldErrors(`items.${p.point_code}.condition`)}
                        </label>
                        <div>
                          <label>
                            <span className="sr-only">Catatan {p.label}</span>
                            <input
                              value={item.note ?? ""}
                              disabled={!editable || loading}
                              placeholder="Catatan kondisi"
                              onChange={(e) =>
                                change(p.point_code, {
                                  note: e.target.value || null,
                                })
                              }
                            />
                          </label>
                          {fieldErrors(`items.${p.point_code}.note`)}
                          <label>
                            <span className="sr-only">Foto {p.label}</span>
                            <input
                              defaultValue={item.photo_refs.join(", ")}
                              disabled={!editable || loading}
                              placeholder="Foto: depan.jpg, detail.jpg"
                              onChange={(e) =>
                                change(p.point_code, {
                                  photo_refs: e.target.value
                                    .split(",")
                                    .map((x) => x.trim())
                                    .filter(Boolean),
                                })
                              }
                            />
                          </label>
                          {fieldErrors(`items.${p.point_code}.photo_refs`)}
                          {fieldErrors(`items.${p.point_code}`).length > 0 && (
                            <span className="sr-only">
                              Periksa validasi titik ini
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </section>
            ))}
            <footer>
              <p>
                {editable
                  ? "Simpan draft untuk melanjutkan nanti."
                  : "Inspeksi ini tidak dapat diedit pada status saat ini."}
              </p>
              <div>
                <button
                  disabled={loading || !editable}
                  onClick={() => save(false)}
                >
                  Simpan Draft
                </button>
                <button
                  className="primary"
                  disabled={loading || !editable}
                  onClick={() => save(true)}
                >
                  {loading ? "Memproses…" : "Submit inspeksi →"}
                </button>
              </div>
            </footer>
          </>
        )}
      </main>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/inspections/new" element={<Form />} />
        <Route path="/inspections/:id" element={<Form />} />
        <Route path="*" element={<Navigate to="/inspections/new" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
