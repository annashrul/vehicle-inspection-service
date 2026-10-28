import React, { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { PwaProvider } from "@/components/pwa/PwaProvider";
import "./style.css";
const InspectionFormPage = lazy(() => import("@/pages/InspectionFormPage"));
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PwaProvider>
      <BrowserRouter>
        <Suspense
          fallback={
            <p className="p-8" role="status">
              Memuat aplikasi…
            </p>
          }
        >
          <Routes>
            <Route path="/inspections/new" element={<InspectionFormPage />} />
            <Route path="/inspections/:id" element={<InspectionFormPage />} />
            <Route
              path="*"
              element={<Navigate to="/inspections/new" replace />}
            />
          </Routes>
        </Suspense>
        <Toaster
          richColors
          closeButton
          position="bottom-right"
          offset={{ bottom: 96, right: 24 }}
          mobileOffset={{
            bottom: "calc(88px + env(safe-area-inset-bottom))",
            right: 16,
            left: 16,
          }}
          containerAriaLabel="Notifikasi"
          toastOptions={{ closeButtonAriaLabel: "Tutup notifikasi" }}
        />
      </BrowserRouter>
    </PwaProvider>
  </React.StrictMode>,
);
