import { useRef } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FormField, FormSection, useFieldA11y } from "./shared";
import { useErrorNavigator } from "@/hooks/useErrorNavigation";
import { POINTS } from "@/lib/checklist";
import type { InspectionValues, FormItem } from "@/lib/inspection-schema";
import type { Vehicle } from "@/types/api";
export function InspectionInformation({
  vehicles,
  readOnly,
  lockedVehicle,
  busy,
}: {
  vehicles: Vehicle[];
  readOnly: boolean;
  lockedVehicle: boolean;
  busy: boolean;
}) {
  const { control, register, getValues, setValue, clearErrors } =
    useFormContext<InspectionValues>();
  const nav = useErrorNavigator();
  const prior = useRef(new Map<number, FormItem["condition"]>());
  const vehicleA11y = useFieldA11y("vehicle_id");
  const nameA11y = useFieldA11y("inspector_name");
  const keyA11y = useFieldA11y("has_key", true);
  const name = register("inspector_name");
  function changeKey(value: boolean) {
    setValue("has_key", value, { shouldDirty: true });
    clearErrors("has_key");
    POINTS.forEach((point, index) => {
      if (point.section !== "ENGINE") return;
      const path = `items.${index}.condition` as const;
      if (!value) {
        prior.current.set(index, getValues(path));
        setValue(path, "NOT_INSPECTABLE", { shouldDirty: true });
      } else {
        setValue(path, prior.current.get(index) ?? "", { shouldDirty: true });
        prior.current.delete(index);
      }
      clearErrors(path);
    });
    if (value)
      toast.info(
        "Periksa kembali kondisi mesin. Catatan sebelumnya tetap tersedia untuk ditinjau.",
      );
  }
  return (
    <FormSection
      number="01"
      title="Informasi inspeksi"
      description="Pilih kendaraan dan identitas petugas pemeriksaan."
    >
      <div className="information-grid">
        <FormField name="vehicle_id" label="Kendaraan" required>
          <Controller
            control={control}
            name="vehicle_id"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(v) => {
                  field.onChange(v);
                  clearErrors("vehicle_id");
                }}
                disabled={readOnly || lockedVehicle || busy}
              >
                <SelectTrigger
                  {...vehicleA11y}
                  ref={nav.refFor("vehicle_id", field.ref)}
                  onBlur={field.onBlur}
                  className="w-full"
                >
                  <SelectValue placeholder="Pilih kendaraan" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.plate_number} · {v.brand} {v.model} ({v.year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <FormField name="inspector_name" label="Nama inspektur" required>
          <Input
            {...name}
            {...nameA11y}
            ref={nav.refFor("inspector_name", name.ref)}
            onChange={(e) => {
              name.onChange(e);
              clearErrors("inspector_name");
            }}
            placeholder="Nama lengkap inspektur"
            autoComplete="name"
            maxLength={200}
            readOnly={readOnly}
            disabled={busy}
          />
        </FormField>
        <div className="key-panel">
          <KeyRound className="size-5 text-primary shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <FormField
              name="has_key"
              label="Kunci kendaraan tersedia"
              hint="Tanpa kunci, kedua titik mesin tidak dapat diperiksa."
            >
              <Controller
                name="has_key"
                control={control}
                render={({ field }) => (
                  <Switch
                    {...keyA11y}
                    ref={nav.refFor("has_key", field.ref)}
                    checked={field.value}
                    onCheckedChange={changeKey}
                    onBlur={field.onBlur}
                    disabled={readOnly || busy}
                    className="key-switch"
                  />
                )}
              />
            </FormField>
          </div>
        </div>
      </div>
    </FormSection>
  );
}
