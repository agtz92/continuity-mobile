import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown } from "lucide-react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { useThemeColors } from "@/theme/useThemeColors";

/**
 * Selector de categoría, gemelo de `ProjectSelect`.
 *
 * Antes el editor de notas pintaba **una categoría por chip**, ocho chips en
 * dos filas, idénticos a los chips de filtro de la lista de notas. El efecto
 * era que al abrir una nota parecía que seguías en la lista con los filtros
 * puestos: mismo componente visual, distinto significado.
 *
 * Un campo con su valor actual dice "esto es un dato de la nota"; una fila de
 * chips dice "esto filtra lo que ves". Y ahora la categoría y el proyecto, que
 * viven uno debajo del otro, se leen como lo que son: dos campos iguales.
 */
export function CategorySelect({
  categories,
  value,
  onChange,
}: {
  categories: { id: string; name: string; color: string }[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const [open, setOpen] = useState(false);

  const selected = value ? categories.find((x) => x.id === value) : null;
  const select = (id: string | null) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        className="flex-row items-center justify-between rounded-lg border border-border bg-border px-3 py-2.5"
      >
        {selected ? (
          <CategoryTag name={selected.name} color={selected.color} />
        ) : (
          <CategoryTag loose />
        )}
        <ChevronDown size={18} color={c.textMuted} />
      </Pressable>

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={t("views.quickNotes.category")}
      >
        <View className="gap-1">
          <Pressable
            onPress={() => select(null)}
            className="flex-row items-center justify-between rounded-lg px-3 py-3"
          >
            <CategoryTag loose />
            {!value && <Check size={18} color={c.accent} />}
          </Pressable>
          {categories.map((cat) => {
            const active = value === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => select(cat.id)}
                className="flex-row items-center justify-between rounded-lg px-3 py-3"
              >
                <CategoryTag name={cat.name} color={cat.color} />
                {active && <Check size={18} color={c.accent} />}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </>
  );
}
