import { Fragment, useState } from "react";
import { Text, View } from "react-native";
import { InfinityIcon } from "lucide-react-native";
import Svg, { Line as SvgLine, Polyline, Text as SvgText } from "react-native-svg";
import type { LoopStats } from "@/lib/types";
import { type ThemeColors } from "@/theme/useThemeColors";
import { PanelCard, StatTile, StatusBar, PURPLE, BLUE, type T } from "./panels";

/**
 * Panel de uso del asistente "Loop" (solo conteos, por privacidad). Resume mensajes,
 * conversaciones, acciones (bloques tool_use que Loop ejecutó) y días activos, más una
 * mini-serie de mensajes por día, las acciones más usadas y el reparto por superficie
 * (en la app vs. conector de Claude). El gráfico se dibuja a mano en SVG igual que
 * ActivityChart; con <=1 punto se omite.
 */
export function LoopPanel({ loop, t, c }: { loop: LoopStats; t: T; c: ThemeColors }) {
  const [width, setWidth] = useState(0);

  const isEmpty =
    loop.messagesSent === 0 &&
    loop.connectorInteractions === 0 &&
    loop.actionsTaken === 0;

  if (isEmpty) {
    return (
      <PanelCard
        title={t("analytics.loop.title")}
        subtitle={t("analytics.loop.subtitle")}
        icon={<InfinityIcon size={16} color={c.accent2} />}
      >
        <Text className="font-sans py-4 text-sm text-text-muted">{t("analytics.loop.empty")}</Text>
      </PanelCard>
    );
  }

  const hasDeep = loop.deepMessages > 0;
  const series = loop.daily;
  const n = series.length;
  const max = Math.max(1, ...series.map((p) => p.messages));

  const H = 150;
  const PAD_L = 26;
  const PAD_R = 10;
  const PAD_T = 12;
  const PAD_B = 22;
  const plotW = Math.max(0, width - PAD_L - PAD_R);
  const plotH = H - PAD_T - PAD_B;
  const xAt = (i: number) =>
    n <= 1 ? PAD_L + plotW / 2 : PAD_L + (i / (n - 1)) * plotW;
  const yAt = (v: number) => PAD_T + (1 - v / max) * plotH;
  const tickEvery = Math.max(1, Math.ceil(n / 7));
  const gridVals = max >= 2 ? [0, max / 2, max] : [0, max];
  const linePoints = (key: "messages" | "deepMessages") =>
    series.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p[key]).toFixed(1)}`).join(" ");

  const surfaceTotal = loop.messagesSent + loop.connectorInteractions;

  return (
    <PanelCard
      title={t("analytics.loop.title")}
      subtitle={t("analytics.loop.subtitle")}
      icon={<InfinityIcon size={16} color={c.accent2} />}
    >
      <View className="gap-3">
        <View className="flex-row gap-3">
          <StatTile
            value={loop.messagesSent}
            label={t("analytics.loop.messages")}
            tone={PURPLE}
          />
          <StatTile
            value={loop.conversations}
            label={t("analytics.loop.conversations")}
          />
        </View>
        <View className="flex-row gap-3">
          <StatTile value={loop.actionsTaken} label={t("analytics.loop.actions")} />
          <StatTile
            value={loop.activeDays}
            label={t("analytics.loop.activeDays")}
          />
        </View>
      </View>

      {n > 1 && (
        <View className="mt-4">
          <View className="mb-2 flex-row gap-4">
            <View className="flex-row items-center gap-1.5">
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: PURPLE }} />
              <Text className="font-sans text-xs text-text-muted">
                {t("analytics.loop.chartMessages")}
              </Text>
            </View>
            {hasDeep && (
              <View className="flex-row items-center gap-1.5">
                <View className="h-2 w-2 rounded-full" style={{ backgroundColor: BLUE }} />
                <Text className="font-sans text-xs text-text-muted">
                  {t("analytics.loop.chartDeep")}
                </Text>
              </View>
            )}
          </View>
          <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: H }}>
            {width > 0 && (
              <Svg width={width} height={H}>
                {gridVals.map((gv, gi) => {
                  const y = yAt(gv);
                  return (
                    <Fragment key={gi}>
                      <SvgLine
                        x1={PAD_L}
                        y1={y}
                        x2={width - PAD_R}
                        y2={y}
                        stroke={c.border}
                        strokeWidth={1}
                        strokeDasharray="3 4"
                      />
                      <SvgText
                        x={PAD_L - 6}
                        y={y + 3}
                        fontSize={9}
                        fill={c.textMuted}
                        textAnchor="end"
                      >
                        {String(Math.round(gv))}
                      </SvgText>
                    </Fragment>
                  );
                })}
                {series.map((p, i) => {
                  if (i % tickEvery !== 0 && i !== n - 1) return null;
                  const [, mo, dy] = p.day.slice(0, 10).split("-");
                  const anchor = i === 0 ? "start" : i === n - 1 ? "end" : "middle";
                  return (
                    <SvgText
                      key={p.day}
                      x={xAt(i)}
                      y={H - 6}
                      fontSize={9}
                      fill={c.textMuted}
                      textAnchor={anchor}
                    >
                      {`${Number(dy)}/${Number(mo)}`}
                    </SvgText>
                  );
                })}
                <Polyline
                  points={linePoints("messages")}
                  fill="none"
                  stroke={PURPLE}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {hasDeep && (
                  <Polyline
                    points={linePoints("deepMessages")}
                    fill="none"
                    stroke={BLUE}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                )}
              </Svg>
            )}
          </View>
        </View>
      )}

      <View className="mt-4 gap-2.5">
        <Text className="font-sans text-[11px] uppercase tracking-wide text-text-muted">
          {t("analytics.loop.topTools")}
        </Text>
        {loop.topTools.length === 0 ? (
          <Text className="font-sans text-sm text-text-muted">{t("analytics.loop.topToolsEmpty")}</Text>
        ) : (
          loop.topTools.map((row) => (
            <View
              key={row.tool}
              className="flex-row items-center justify-between gap-3 rounded-lg border border-border bg-bg px-3 py-2"
            >
              <Text className="font-sans min-w-0 flex-1 text-sm capitalize text-text" numberOfLines={1}>
                {row.tool.replace(/_/g, " ")}
              </Text>
              <Text className="text-base font-sans-semibold text-text">{row.count}</Text>
            </View>
          ))
        )}
      </View>

      <View className="mt-4 gap-2.5">
        <Text className="font-sans text-[11px] uppercase tracking-wide text-text-muted">
          {t("analytics.loop.surfaces")}
        </Text>
        <View className="gap-2.5">
          <StatusBar
            label={t("analytics.loop.inApp")}
            count={loop.messagesSent}
            total={surfaceTotal}
            color={PURPLE}
          />
          <StatusBar
            label={t("analytics.loop.connector")}
            count={loop.connectorInteractions}
            total={surfaceTotal}
            color={BLUE}
          />
        </View>
      </View>
    </PanelCard>
  );
}
