import { Fragment, useState, type ReactNode } from "react";
import { Pressable, Text } from "react-native";
import { useTranslation } from "react-i18next";

/**
 * Renders a list capped at `initialCount` with a "Show N more / Show less"
 * toggle when there are hidden items. Returns a fragment so it adopts the
 * parent's layout (the caller owns spacing via a gap on the wrapper).
 */
export function ShowMoreList<T>({
  items,
  initialCount = 5,
  renderItem,
  itemKey,
}: {
  items: T[];
  initialCount?: number;
  renderItem: (item: T, index: number) => ReactNode;
  /** Stable key per item. */
  itemKey: (item: T, index: number) => string;
}) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? items : items.slice(0, initialCount);
  const hidden = items.length - initialCount;

  return (
    <>
      {visible.map((item, idx) => (
        <Fragment key={itemKey(item, idx)}>{renderItem(item, idx)}</Fragment>
      ))}
      {hidden > 0 && (
        <Pressable onPress={() => setShowAll((s) => !s)} className="mt-1 self-start">
          <Text className="text-xs font-medium text-accent">
            {showAll
              ? t("common.showLess")
              : t("common.showMore", { count: hidden })}
          </Text>
        </Pressable>
      )}
    </>
  );
}
