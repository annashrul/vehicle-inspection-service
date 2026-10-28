import {
  useFieldArray,
  useFormContext,
  useFormState,
  useWatch,
} from "react-hook-form";
import {
  CarFront,
  CheckCircle2,
  CircleAlert,
  Cog,
  Armchair,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  SECTIONS,
  SECTION_LABELS,
  POINTS,
  type Section,
} from "@/lib/checklist";
import { isItemValid, type InspectionValues } from "@/lib/inspection-schema";
import { InspectionItemCard } from "./InspectionItemCard";
const sectionIcons = { EXTERIOR: CarFront, INTERIOR: Armchair, ENGINE: Cog };
function SectionHeading({ section }: { section: Section }) {
  const { control } = useFormContext<InspectionValues>();
  const indices = POINTS.flatMap((p, i) => (p.section === section ? [i] : []));
  const items = useWatch({
    control,
    name: indices.map((i) => `items.${i}` as const),
  });
  const key = useWatch({ control, name: "has_key" });
  const { errors } = useFormState({
    control,
    name: indices.map((i) => `items.${i}` as const),
  });
  const valid = items.filter((i) => isItemValid(i, key)).length;
  const hasError = indices.some((i) => !!errors.items?.[i]);
  const Icon = sectionIcons[section];
  return (
    <>
      <span className="accordion-icon">
        <Icon aria-hidden />
      </span>
      <span className="accordion-label">
        <strong>{SECTION_LABELS[section]}</strong>
        <span>{indices.length} titik pemeriksaan</span>
      </span>
      <span
        id={`section-status-${section}`}
        className={`section-count ${hasError ? "text-destructive" : valid === indices.length ? "text-primary" : ""}`}
      >
        <span className="sr-only">
          {hasError
            ? "Ada kolom yang perlu diperbaiki. "
            : valid === indices.length
              ? "Bagian lengkap. "
              : ""}
        </span>
        {hasError ? (
          <CircleAlert aria-hidden />
        ) : valid === indices.length ? (
          <CheckCircle2 aria-hidden />
        ) : null}
        <span>
          {valid}/{indices.length}
          <span className="sr-only"> valid</span>
        </span>
      </span>
    </>
  );
}
function EngineNotice() {
  const { control } = useFormContext<InspectionValues>();
  const key = useWatch({ control, name: "has_key" });
  return !key ? (
    <Alert className="engine-alert">
      <Cog aria-hidden />
      <AlertTitle>Pemeriksaan mesin tanpa kunci</AlertTitle>
      <AlertDescription>
        Kondisi mesin diatur ke “Tidak dapat diperiksa”. Catatan alasan tetap
        wajib diisi untuk setiap titik.
      </AlertDescription>
    </Alert>
  ) : null;
}
export function ChecklistAccordion({
  open,
  onOpenChange,
  readOnly,
  busy,
}: {
  open: string[];
  onOpenChange: (value: string[]) => void;
  readOnly: boolean;
  busy: boolean;
}) {
  const { control } = useFormContext<InspectionValues>();
  const { fields } = useFieldArray({ control, name: "items" });
  return (
    <section aria-labelledby="checklist-title" className="checklist-section">
      <div className="checklist-title">
        <div>
          <p className="eyebrow">02 / CHECKLIST</p>
          <h2 id="checklist-title">Kondisi kendaraan</h2>
          <p>
            Buka bagian yang ingin diperiksa. Anda dapat membuka beberapa bagian
            sekaligus.
          </p>
        </div>
        <span className="checklist-total">14 titik</span>
      </div>
      <EngineNotice />
      <Accordion
        type="multiple"
        value={open}
        onValueChange={onOpenChange}
        className="checklist-accordion"
      >
        {SECTIONS.map((section) => (
          <AccordionItem
            value={section}
            key={section}
            className="checklist-accordion-item"
          >
            <AccordionTrigger
              className="section-trigger"
              aria-label={`Bagian ${SECTION_LABELS[section]}`}
              aria-describedby={`section-status-${section}`}
            >
              <SectionHeading section={section} />
            </AccordionTrigger>
            <AccordionContent className="section-content">
              <div className="item-stack">
                {fields.map((field, index) =>
                  POINTS[index].section === section ? (
                    <InspectionItemCard
                      key={field.id}
                      index={index}
                      readOnly={readOnly}
                      busy={busy}
                    />
                  ) : null,
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
