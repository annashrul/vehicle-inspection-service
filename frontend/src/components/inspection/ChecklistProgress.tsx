import { useWatch, useFormContext } from "react-hook-form";
import { CheckCheck, ClipboardList } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { POINTS, SECTIONS, SECTION_LABELS } from "@/lib/checklist";
import { isItemValid, type InspectionValues } from "@/lib/inspection-schema";
export function ChecklistProgress({ compact = false }: { compact?: boolean }) {
  const { control } = useFormContext<InspectionValues>();
  const items = useWatch({ control, name: "items" });
  const key = useWatch({ control, name: "has_key" });
  const count = (items ?? []).filter((i) => isItemValid(i, key)).length;
  return (
    <div
      className={compact ? "checklist-progress compact" : "checklist-progress"}
      data-testid={compact ? "progress-compact" : "progress-global"}
    >
      <div className="progress-heading">
        <span>
          {count === 14 ? (
            <CheckCheck aria-hidden />
          ) : (
            <ClipboardList aria-hidden />
          )}
          {compact ? "Checklist" : "Progress pemeriksaan"}
        </span>
        <strong>
          {count}
          <span>/14</span>
        </strong>
      </div>
      <Progress
        value={(count / 14) * 100}
        aria-label={`${count} dari 14 titik valid`}
      />
      <p>
        {count === 0
          ? "Belum dimulai"
          : count === 14
            ? "Lengkap · siap diperiksa sebelum submit"
            : "Dalam proses · lengkapi kondisi, catatan, dan foto"}
      </p>
      {!compact && (
        <div className="progress-sections">
          {SECTIONS.map((section) => (
            <div key={section}>
              <span>{SECTION_LABELS[section]}</span>
              <strong>
                {
                  items.filter(
                    (i, index) =>
                      POINTS[index]?.section === section && isItemValid(i, key),
                  ).length
                }
                /{POINTS.filter((p) => p.section === section).length}
              </strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
