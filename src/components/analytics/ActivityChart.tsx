import { Fragment, useState } from "react";
import { Text, View } from "react-native";
import { LineChart as LineIcon } from "lucide-react-native";
import Svg, { Circle, Line as SvgLine, Polyline, Text as SvgText } from "react-native-svg";
import type { ActivityPoint } from "@/lib/types";
import { useThemeColors } from "@/theme/useThemeColors";
import { PanelCard, EMERALD, BLUE, type T } from "./panels";

/**
 * Gráfico de líneas (actualizaciones vs. tareas completadas por día) dibujado a mano
 * en SVG. El ancho se mide con onLayout porque SVG necesita píxeles absolutos, no
 * porcentajes; las escalas xAt/yAt mapean índice y valor al área de trazado interior.
 * Supuestos: `max` mínimo 1 evita división por cero con series vacías/planas; con un
 * solo punto se dibujan círculos en vez de polilíneas.
 */
export function ActivityChart({ series, t }: { series: ActivityPoint[]; t: T }) {
  const c = useThemeColors();
  const [width, setWidth] = useState(0);
  const n = series.length;
  const max = Math.max(
    1,
    ...series.flatMap((p) => [p.updates, p.completedTasks])
  );

  const H = 180;
  // Padding interno del lienzo SVG: izquierda mayor para las etiquetas del eje Y,
  // inferior para las fechas del eje X.
  const PAD_L = 26;
  const PAD_R = 10;
  const PAD_T = 12;
  const PAD_B = 22;
  const plotW = Math.max(0, width - PAD_L - PAD_R);
  const plotH = H - PAD_T - PAD_B;

  // xAt: índice → x (centra el único punto si n<=1). yAt: valor → y (invertido:
  // SVG crece hacia abajo, así que 0 queda al fondo del área de trazado).
  const xAt = (i: number) =>
    n <= 1 ? PAD_L + plotW / 2 : PAD_L + (i / (n - 1)) * plotW;
  const yAt = (v: number) => PAD_T + (1 - v / max) * plotH;

  // tickEvery limita a ~7 etiquetas de fecha sin importar el rango.
  // gridVals: 3 líneas (0/medio/max) salvo cuando max<2, donde "medio" sería ruido.
  const tickEvery = Math.max(1, Math.ceil(n / 7));
  const gridVals = max >= 2 ? [0, max / 2, max] : [0, max];

  const points = (key: "updates" | "completedTasks") =>
    series.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p[key]).toFixed(1)}`).join(" ");

  return (
    <PanelCard title={t("analytics.activityChart.title")} icon={<LineIcon size={16} color={EMERALD} />}>
      <View className="mb-3 flex-row gap-4">
        <View className="flex-row items-center gap-1.5">
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: EMERALD }} />
          <Text className="font-sans text-xs text-text-muted">{t("analytics.activityChart.updates")}</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: BLUE }} />
          <Text className="font-sans text-xs text-text-muted">{t("analytics.activityChart.tasks")}</Text>
        </View>
      </View>
      {n === 0 ? (
        <Text className="font-sans py-4 text-sm text-text-muted">—</Text>
      ) : (
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

              {n === 1 ? (
                <>
                  <Circle cx={xAt(0)} cy={yAt(series[0].updates)} r={3.5} fill={EMERALD} />
                  <Circle cx={xAt(0)} cy={yAt(series[0].completedTasks)} r={3.5} fill={BLUE} />
                </>
              ) : (
                <>
                  <Polyline
                    points={points("updates")}
                    fill="none"
                    stroke={EMERALD}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  <Polyline
                    points={points("completedTasks")}
                    fill="none"
                    stroke={BLUE}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </>
              )}
            </Svg>
          )}
        </View>
      )}
    </PanelCard>
  );
}
