import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react-native";
import type { ChatMessage } from "@/hooks/useAssistant";
import { alpha, useThemeColors } from "@/theme/useThemeColors";
import { ToolCallCard } from "./ToolCallCard";

export function Message({ message }: { message: ChatMessage }) {
  const { t } = useTranslation();
  const c = useThemeColors();

  if (message.role === "user") {
    return (
      <View className="items-end">
        <View
          className="max-w-[85%] rounded-2xl border px-3 py-2"
          style={{
            backgroundColor: alpha(c.accent, 0.15),
            borderColor: alpha(c.accent, 0.3),
          }}
        >
          <Text className="text-sm" style={{ color: c.accent }}>
            {message.text}
          </Text>
        </View>
      </View>
    );
  }

  // assistant
  const isEmpty = message.blocks.length === 0;
  return (
    <View className="flex-row gap-2">
      <View
        className="h-7 w-7 items-center justify-center rounded-full"
        style={{ backgroundColor: c.accent }}
      >
        <Sparkles size={14} color={c.bg} />
      </View>
      <View className="min-w-0 flex-1">
        {isEmpty ? (
          <Text className="text-xs italic text-text-muted">
            {t("assistant.message.thinking")}
          </Text>
        ) : (
          message.blocks.map((block, i) => {
            if (block.type === "text") {
              return (
                <Text
                  key={i}
                  className="text-sm leading-relaxed text-text"
                >
                  {block.text}
                </Text>
              );
            }
            return <ToolCallCard key={block.id} block={block} />;
          })
        )}
      </View>
    </View>
  );
}
