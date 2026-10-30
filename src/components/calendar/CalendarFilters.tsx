import { useTranslation } from "react-i18next";
import { Gauge, ListChecks } from "lucide-react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { SheetRow } from "@/components/more/SheetRow";

/** Hoja de filtros del calendario: ver tareas (o solo proyectos) y carga. */
export function CalendarFilters({
  visible,
  onClose,
  showTasks,
  onToggleTasks,
  showLoad,
  onToggleLoad,
}: {
  visible: boolean;
  onClose: () => void;
  showTasks: boolean;
  onToggleTasks: () => void;
  showLoad: boolean;
  onToggleLoad: () => void;
}) {
  const { t } = useTranslation();
  return (
    <BottomSheet visible={visible} onClose={onClose} title={t("views.calendar.filters")}>
      <SheetRow icon={ListChecks} label={t("views.calendar.showTasks")} selected={showTasks} onPress={onToggleTasks} />
      <SheetRow icon={Gauge} label={t("views.calendar.load")} selected={showLoad} onPress={onToggleLoad} />
    </BottomSheet>
  );
}
