import {
  Controller,
  useFieldArray,
  useFormContext,
  useFormState,
  useWatch,
} from "react-hook-form";
import {
  Ban,
  CheckCircle2,
  CircleCheck,
  ImagePlus,
  Plus,
  ShieldAlert,
  Trash2,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { FieldError, FormField, fieldId, useFieldA11y } from "./shared";
import { CONDITIONS, CONDITION_LABELS, POINTS } from "@/lib/checklist";
import { isItemValid, type InspectionValues } from "@/lib/inspection-schema";
import { useErrorNavigator } from "@/hooks/useErrorNavigation";
const icons = {
  GOOD: CheckCircle2,
  MINOR_DAMAGE: Wrench,
  MAJOR_DAMAGE: ShieldAlert,
  NOT_INSPECTABLE: Ban,
};
function PhotoReferences({
  index,
  disabled,
}: {
  index: number;
  disabled: boolean;
}) {
  const { control, register, clearErrors } = useFormContext<InspectionValues>();
  const name = `items.${index}.photo_refs` as const;
  const { fields, append, remove } = useFieldArray({ control, name });
  const nav = useErrorNavigator();
  const a11y = useFieldA11y(name);
  return (
    <div className="photo-field">
      <div className="photo-heading">
        <Label htmlFor={fieldId(name)}>Referensi foto</Label>
        <span>Nama file saja</span>
      </div>
      <div className="photo-list">
        {fields.map((photo, n) => (
          <PhotoInput
            key={photo.id}
            index={index}
            photoIndex={n}
            disabled={disabled}
            onRemove={() => {
              remove(n);
              clearErrors(name);
              nav.navigate(name);
            }}
          />
        ))}
      </div>
      <Button
        {...a11y}
        aria-label="Tambah referensi foto"
        ref={nav.refFor(name)}
        type="button"
        variant="outline"
        className="photo-add"
        disabled={disabled}
        onClick={() => {
          append({ value: "" }, { shouldFocus: false });
          clearErrors(name);
          nav.navigate(`${name}.${fields.length}.value`);
        }}
      >
        <Plus aria-hidden />
        Tambah referensi foto
      </Button>
      <FieldError name={name} />
      {!fields.length && (
        <p className="field-hint inline-flex items-center gap-1.5">
          <ImagePlus className="size-3.5" aria-hidden />
          Wajib jika terdapat kerusakan besar.
        </p>
      )}
      <input type="hidden" {...register(`items.${index}.point_code`)} />
    </div>
  );
}
function PhotoInput({
  index,
  photoIndex,
  disabled,
  onRemove,
}: {
  index: number;
  photoIndex: number;
  disabled: boolean;
  onRemove: () => void;
}) {
  const name = `items.${index}.photo_refs.${photoIndex}.value` as const;
  const { register, clearErrors, getValues } =
    useFormContext<InspectionValues>();
  const field = register(name);
  const nav = useErrorNavigator();
  const a11y = useFieldA11y(name);
  return (
    <div>
      <div className="photo-row">
        <Input
          {...field}
          {...a11y}
          ref={nav.refFor(name, field.ref)}
          aria-label={`Foto ${POINTS[index].label} ${photoIndex + 1}`}
          placeholder="Contoh: depan-kendaraan.jpg"
          readOnly={disabled}
          onChange={(e) => {
            field.onChange(e);
            clearErrors(name);
            if (
              getValues(`items.${index}.photo_refs`).every((p) =>
                p.value.trim(),
              )
            )
              clearErrors(`items.${index}.photo_refs`);
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={onRemove}
          aria-label={`Hapus foto ${POINTS[index].label} ${photoIndex + 1}`}
        >
          <Trash2 aria-hidden />
        </Button>
      </div>
      <FieldError name={name} />
    </div>
  );
}
export function InspectionItemCard({
  index,
  readOnly,
  busy,
}: {
  index: number;
  readOnly: boolean;
  busy: boolean;
}) {
  const { control, register, clearErrors, setValue } =
    useFormContext<InspectionValues>();
  const item = useWatch({ control, name: `items.${index}` });
  const key = useWatch({ control, name: "has_key" });
  const { errors } = useFormState({ control, name: `items.${index}` });
  const point = POINTS[index];
  const nav = useErrorNavigator();
  const conditionName = `items.${index}.condition` as const;
  const noteName = `items.${index}.note` as const;
  const conditionA11y = useFieldA11y(conditionName);
  const noteA11y = useFieldA11y(noteName, item.condition === "NOT_INSPECTABLE");
  const note = register(noteName);
  const valid = isItemValid(item, key);
  const lockedEngine = !key && point.section === "ENGINE";
  const itemError = !!errors.items?.[index];
  return (
    <article
      className={`inspection-item ${itemError ? "has-error" : ""}`}
      aria-labelledby={`point-${point.point_code}`}
      data-testid={`point-${point.point_code}`}
    >
      <div className="item-heading">
        <div>
          <span className="point-code">{point.point_code}</span>
          <h3 id={`point-${point.point_code}`}>{point.label}</h3>
        </div>
        {valid ? (
          <Badge variant="outline" className="valid-badge">
            <CircleCheck aria-hidden />
            Valid
          </Badge>
        ) : (
          <span className="item-pending">
            {itemError ? "Perlu diperbaiki" : "Belum lengkap"}
          </span>
        )}
      </div>
      <FormField name={conditionName} label={`Kondisi ${point.label}`} required>
        <Controller
          control={control}
          name={conditionName}
          render={({ field }) => (
            <RadioGroup
              tabIndex={-1}
              {...conditionA11y}
              aria-label={`Kondisi ${point.label}`}
              ref={(node) => {
                nav.refFor(
                  conditionName,
                  field.ref,
                )(
                  node?.querySelector<HTMLElement>(
                    '[role="radio"]:not([disabled])',
                  ) ?? node,
                );
              }}
              value={field.value}
              onValueChange={(v) => {
                field.onChange(v);
                clearErrors(conditionName);
              }}
              onBlur={field.onBlur}
              disabled={readOnly || busy || lockedEngine}
              className="condition-options"
            >
              {CONDITIONS.map((condition) => {
                const Icon = icons[condition];
                return (
                  <Label
                    key={condition}
                    className={`condition-option ${field.value === condition ? "selected" : ""}`}
                    htmlFor={`${point.point_code}-${condition}`}
                  >
                    <RadioGroupItem
                      value={condition}
                      id={`${point.point_code}-${condition}`}
                      aria-describedby={conditionA11y["aria-describedby"]}
                      aria-invalid={conditionA11y["aria-invalid"]}
                    />
                    <Icon className="condition-icon" aria-hidden />
                    <span>{CONDITION_LABELS[condition]}</span>
                  </Label>
                );
              })}
            </RadioGroup>
          )}
        />
      </FormField>
      {!readOnly && !lockedEngine && item.condition && (
        <Button
          type="button"
          variant="ghost"
          className="clear-condition"
          onClick={() => {
            setValue(conditionName, "", { shouldDirty: true });
            clearErrors(conditionName);
          }}
        >
          Batalkan pilihan kondisi
        </Button>
      )}
      {lockedEngine && (
        <p className="engine-note">
          <Ban className="size-3.5" aria-hidden />
          Diatur otomatis karena kunci tidak tersedia. Isi alasan pada catatan.
        </p>
      )}
      <Separator className="my-4" />
      <div className="item-details">
        <FormField
          name={noteName}
          label={`Catatan ${point.label}`}
          required={item.condition === "NOT_INSPECTABLE"}
          hint={
            item.condition === "NOT_INSPECTABLE"
              ? "Jelaskan mengapa titik ini tidak dapat diperiksa."
              : undefined
          }
        >
          <Textarea
            {...note}
            {...noteA11y}
            ref={nav.refFor(noteName, note.ref)}
            onChange={(e) => {
              note.onChange(e);
              clearErrors(noteName);
            }}
            placeholder="Tulis temuan atau alasan pemeriksaan…"
            rows={3}
            readOnly={readOnly}
            disabled={busy}
          />
        </FormField>
        <PhotoReferences index={index} disabled={readOnly || busy} />
      </div>
    </article>
  );
}
