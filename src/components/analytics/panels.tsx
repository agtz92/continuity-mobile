"use client";

/**
 * Paneles de la pantalla de Analítica (mobile), extraídos de analytics.tsx
 * (ver AUDITORIA_CODIGO.md / docs/refactor-modularidad.md). Son presentacionales:
 * reciben los datos + `t` (+ `c` donde aplica) por props; `ActivityChart` dibuja
 * el SVG a mano. `PanelCard`/`StatTile`/`StatusBar`/`Delta` son las piezas
 * compartidas. La pantalla (`analytics.tsx`) los compone vía su switch renderPanel.
 */

import { Fragment, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowRightCircle,
  ArrowUp,
  BarChart3,
  CalendarDays,
  Clock,
  Hourglass,
  Lightbulb,
  LineChart as LineIcon,
  MessageSquare,
  Minus,
  MoonStar,
  PieChart as PieIcon,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react-native";
import Svg, {
  Circle,
  Line as SvgLine,
  Polyline,
  Text as SvgText,
} from "react-native-svg";
import type {
  ActivityPoint,
  BacklogHealth,
  CadenceStats,
  CategoryRow,
  EffortStats,
  IdeaFunnel,
  LoopStats,
  ProjectInteractionRow,
  ProjectStatus,
  SleepingProjectRow,
  StaleIdeaRow,
  StatusCount,
  WeekdayBucket,
} from "@/lib/types";
import {
  alpha,
  categoryChipColors,
  useThemeColors,
  type ThemeColors,
} from "@/theme/useThemeColors";

export type T = (key: string, params?: Record<string, string | number>) => string;

export const AMBER = "rgb(251,191,36)";
export const ROSE = "rgb(251,113,133)";
export const PURPLE = "rgb(192,132,252)";
export const CYAN = "rgb(34,211,238)";
export const INDIGO = "rgb(129,140,248)";
export const PINK = "rgb(244,114,182)";
export const ORANGE = "rgb(251,146,60)";
export const YELLOW = "rgb(250,204,21)";
export const EMERALD = "rgb(52,211,153)";
export const BLUE = "rgb(96,165,250)";


/** Tarjeta contenedora común a todos los paneles: encabezado (icono + título +
 *  subtítulo opcional) sobre un cuerpo arbitrario. Unifica el chrome para que cada
 *  panel solo aporte su contenido. */
export function PanelCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View className="rounded-xl border border-border bg-surface p-4">
      <View className="mb-3">
        <View className="flex-row items-center gap-2">
          {icon}
          <Text className="text-sm font-semibold text-text">{title}</Text>
        </View>
        {subtitle ? (
          <Text className="mt-0.5 text-xs text-text-muted">{subtitle}</Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** Casilla de métrica reutilizable (valor grande + etiqueta, sufijo y color de tono
 *  opcionales). Con `icon` la etiqueta va arriba junto al icono; sin él va debajo,
 *  para acomodar tanto tiles compactas como destacadas. */
export function StatTile({
  value,
  suffix,
  label,
  tone,
  icon,
}: {
  value: number | string;
  suffix?: string;
  label: string;
  tone?: string;
  icon?: ReactNode;
}) {
  return (
    <View className="flex-1 rounded-lg border border-border bg-bg p-3">
      {icon && (
        <View className="mb-1 flex-row items-center gap-1.5">
          {icon}
          <Text className="text-[11px] text-text-muted">{label}</Text>
        </View>
      )}
      <Text className="text-2xl font-semibold" style={tone ? { color: tone } : undefined}>
        <Text className="text-2xl font-semibold text-text" style={tone ? { color: tone } : undefined}>
          {value}
        </Text>
        {suffix ? <Text className="text-sm text-text-muted"> {suffix}</Text> : null}
      </Text>
      {!icon && <Text className="mt-1 text-xs text-text-muted">{label}</Text>}
    </View>
  );
}

export function CadencePanel({ cadence, t }: { cadence: CadenceStats; t: T }) {
  return (
    <PanelCard title={t("analytics.cadence.title")} icon={<CalendarDays size={16} color={AMBER} />}>
      <View className="gap-3">
        <View className="flex-row gap-3">
          <StatTile value={cadence.activeDaysInRange} label={t("analytics.cadence.activeDays")} />
          <StatTile value={cadence.totalActivityEvents} label={t("analytics.cadence.events")} />
        </View>
      </View>
    </PanelCard>
  );
}

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
          <Text className="text-xs text-text-muted">{t("analytics.activityChart.updates")}</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: BLUE }} />
          <Text className="text-xs text-text-muted">{t("analytics.activityChart.tasks")}</Text>
        </View>
      </View>
      {n === 0 ? (
        <Text className="py-4 text-sm text-text-muted">—</Text>
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
        icon={<Sparkles size={16} color={c.accent2} />}
      >
        <Text className="py-4 text-sm text-text-muted">{t("analytics.loop.empty")}</Text>
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
      icon={<Sparkles size={16} color={c.accent2} />}
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
              <Text className="text-xs text-text-muted">
                {t("analytics.loop.chartMessages")}
              </Text>
            </View>
            {hasDeep && (
              <View className="flex-row items-center gap-1.5">
                <View className="h-2 w-2 rounded-full" style={{ backgroundColor: BLUE }} />
                <Text className="text-xs text-text-muted">
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
        <Text className="text-[11px] uppercase tracking-wide text-text-muted">
          {t("analytics.loop.topTools")}
        </Text>
        {loop.topTools.length === 0 ? (
          <Text className="text-sm text-text-muted">{t("analytics.loop.topToolsEmpty")}</Text>
        ) : (
          loop.topTools.map((row) => (
            <View
              key={row.tool}
              className="flex-row items-center justify-between gap-3 rounded-lg border border-border bg-bg px-3 py-2"
            >
              <Text className="min-w-0 flex-1 text-sm capitalize text-text" numberOfLines={1}>
                {row.tool.replace(/_/g, " ")}
              </Text>
              <Text className="text-base font-semibold text-text">{row.count}</Text>
            </View>
          ))
        )}
      </View>

      <View className="mt-4 gap-2.5">
        <Text className="text-[11px] uppercase tracking-wide text-text-muted">
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

/** Barra de progreso horizontal de una sola fila (etiqueta + conteo encima, barra
 *  rellena por porcentaje debajo). Usada en el breakdown por estado; el ancho se
 *  deriva de count/total y se pinta con el color del estado. */
export function StatusBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View>
      <View className="mb-1 flex-row justify-between">
        <Text className="text-xs text-text-muted">{label}</Text>
        <Text className="text-xs text-text-muted">{count}</Text>
      </View>
      <View className="h-1.5 overflow-hidden rounded-full bg-border">
        <View style={{ height: "100%", width: `${pct}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}

/** Panel doble: distribución de proyectos por estado (barras) y por categoría (filas
 *  con punto de color). STATUS_ORDER fija un orden semántico estable (idea→archived)
 *  en lugar del orden con que lleguen los datos; los estados con conteo 0 se omiten. */
export function StatusBreakdownPanel({
  statusCounts,
  categoryBreakdown,
  t,
  c,
}: {
  statusCounts: StatusCount[];
  categoryBreakdown: CategoryRow[];
  t: T;
  c: ThemeColors;
}) {
  const total = statusCounts.reduce((acc, s) => acc + s.count, 0);
  const STATUS_ORDER: ProjectStatus[] = [
    "idea",
    "active",
    "stalled",
    "paused",
    "launched",
    "killed",
    "archived",
  ];
  // Color por estado: algunos salen del tema (active/launched/muted) para respetar la
  // paleta del usuario; killed es rojo fijo porque ningún acento del tema comunica
  // "matado" de forma fiable.
  const STATUS_COLOR: Record<ProjectStatus, string> = {
    idea: AMBER,
    active: c.accent,
    stalled: ROSE,
    paused: c.textMuted,
    launched: c.accent2,
    killed: "rgb(239,68,68)",
    archived: c.textMuted,
  };
  return (
    <PanelCard
      title={t("analytics.statusBreakdown.title")}
      icon={<PieIcon size={16} color={CYAN} />}
      subtitle={t("analytics.statusBreakdown.subtitle", { count: total })}
    >
      <View className="gap-5">
        <View className="gap-2.5">
          <Text className="text-[11px] uppercase tracking-wide text-text-muted">
            {t("analytics.statusBreakdown.status")}
          </Text>
          {statusCounts.length === 0 ? (
            <Text className="text-sm text-text-muted">{t("analytics.statusBreakdown.noData")}</Text>
          ) : (
            STATUS_ORDER.map((s) => {
              const row = statusCounts.find((x) => x.status === s);
              if (!row || row.count === 0) return null;
              return (
                <StatusBar
                  key={s}
                  label={t(`status.${s}`)}
                  count={row.count}
                  total={total}
                  color={STATUS_COLOR[s]}
                />
              );
            })
          )}
        </View>
        <View className="gap-2.5">
          <Text className="text-[11px] uppercase tracking-wide text-text-muted">
            {t("analytics.statusBreakdown.category")}
          </Text>
          {categoryBreakdown.length === 0 ? (
            <Text className="text-sm text-text-muted">{t("analytics.statusBreakdown.noCategories")}</Text>
          ) : (
            categoryBreakdown.map((cat) => (
              <View
                key={cat.categoryId ?? "none"}
                className="flex-row items-center justify-between gap-3"
              >
                <View className="min-w-0 flex-1 flex-row items-center gap-2">
                  <View
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: categoryChipColors(cat.color, c).dot }}
                  />
                  <Text className="flex-1 text-sm text-text" numberOfLines={1}>
                    {cat.name}
                  </Text>
                </View>
                <Text className="text-xs text-text-muted">
                  {t("analytics.statusBreakdown.rowMeta", {
                    projects: cat.projectCount,
                    interactions: cat.interactions,
                  })}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </PanelCard>
  );
}

export function BacklogPanel({ backlog, t, c }: { backlog: BacklogHealth; t: T; c: ThemeColors }) {
  return (
    <PanelCard
      title={t("analytics.backlog.title")}
      icon={<AlertTriangle size={16} color={AMBER} />}
      subtitle={t("analytics.backlog.subtitle", { count: backlog.openTasks })}
    >
      <View className="gap-3">
        <View className="flex-row gap-3">
          <StatTile
            value={backlog.overdueTasks}
            label={t("analytics.backlog.overdue")}
            tone={ROSE}
            icon={<AlertTriangle size={14} color={ROSE} />}
          />
          <StatTile
            value={backlog.dueSoonTasks}
            label={t("analytics.backlog.dueSoon")}
            tone={AMBER}
            icon={<Clock size={14} color={AMBER} />}
          />
        </View>
        <View className="flex-row gap-3">
          <StatTile
            value={backlog.quickWins}
            label={t("analytics.backlog.quickWins")}
            tone={c.accent}
            icon={<Target size={14} color={c.accent} />}
          />
          <StatTile
            value={backlog.almostThere}
            label={t("analytics.backlog.almostThere")}
            tone={c.accent2}
            icon={<Trophy size={14} color={c.accent2} />}
          />
        </View>
      </View>
    </PanelCard>
  );
}

/** Heatmap de actividad por día de semana (lun→dom). La intensidad relativa al
 *  máximo modula la opacidad del verde; el suelo de 0.08 deja visibles las celdas en
 *  cero. weekday se asume 1=lunes..7=domingo para alinear con las KEYS. */
export function WeekdayHeatmap({ heatmap, t }: { heatmap: WeekdayBucket[]; t: T }) {
  const KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
  const max = Math.max(1, ...heatmap.map((b) => b.count));
  const lookup = new Map(heatmap.map((b) => [b.weekday, b.count] as const));
  return (
    <PanelCard title={t("analytics.weekday.title")} icon={<CalendarDays size={16} color={PURPLE} />}>
      <View className="flex-row gap-2">
        {KEYS.map((key, i) => {
          const wd = i + 1;
          const count = lookup.get(wd) ?? 0;
          const intensity = count / max;
          const opacity = count === 0 ? 0.08 : 0.25 + intensity * 0.75;
          return (
            <View key={wd} className="flex-1 items-center gap-1.5">
              <View
                className="aspect-square w-full items-center justify-center rounded-md"
                style={{ backgroundColor: `rgba(52, 211, 153, ${opacity})` }}
              >
                <Text className="text-xs font-semibold text-text">{count}</Text>
              </View>
              <Text className="text-[10px] text-text-muted">
                {t(`analytics.weekday.labels.${key}`)}
              </Text>
            </View>
          );
        })}
      </View>
    </PanelCard>
  );
}

/** Indicador de variación vs. periodo previo: flecha + cifra coloreada según signo
 *  (acento al subir, rosa al bajar, guion neutro en 0). */
export function Delta({ value, c }: { value: number; c: ThemeColors }) {
  if (value === 0) {
    return (
      <View className="flex-row items-center gap-0.5">
        <Minus size={12} color={c.textMuted} />
        <Text className="text-xs text-text-muted">0</Text>
      </View>
    );
  }
  if (value > 0) {
    return (
      <View className="flex-row items-center gap-0.5">
        <ArrowUp size={12} color={c.accent} />
        <Text className="text-xs text-accent">+{value}</Text>
      </View>
    );
  }
  return (
    <View className="flex-row items-center gap-0.5">
      <ArrowDown size={12} color={ROSE} />
      <Text className="text-xs" style={{ color: ROSE }}>
        {value}
      </Text>
    </View>
  );
}

export function TopProjectsPanel({
  rows,
  t,
  c,
}: {
  rows: ProjectInteractionRow[];
  t: T;
  c: ThemeColors;
}) {
  return (
    <PanelCard
      title={t("analytics.topProjects.title")}
      icon={<TrendingUp size={16} color={c.accent2} />}
      subtitle={t("analytics.topProjects.subtitle")}
    >
      {rows.length === 0 ? (
        <Text className="py-4 text-sm text-text-muted">{t("analytics.topProjects.empty")}</Text>
      ) : (
        <View className="gap-2">
          {rows.map((r) => (
            <View
              key={r.projectId}
              className="flex-row items-center justify-between gap-3 rounded-lg border border-border bg-bg px-3 py-2"
            >
              <View className="min-w-0 flex-1">
                <Text className="text-sm text-text" numberOfLines={1}>
                  {r.name}
                </Text>
                <Text className="text-[11px] text-text-muted">{t(`status.${r.status}`)}</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Delta value={r.deltaVsPrev} c={c} />
                <Text className="text-base font-semibold text-text">{r.interactions}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </PanelCard>
  );
}

export function SleepingStalePanel({
  sleeping,
  stale,
  t,
}: {
  sleeping: SleepingProjectRow[];
  stale: StaleIdeaRow[];
  t: T;
}) {
  // Tono del badge según los días inactivos del proyecto, en rangos crecientes de
  // urgencia: "7-14" ámbar, "15-30" naranja, "30+" rosa. `base` es el RGB crudo para
  // componer fondo/borde con alpha; `text` el color sólido de la etiqueta.
  const BUCKET: Record<SleepingProjectRow["bucket"], { base: string; text: string }> = {
    "7-14": { base: "245,158,11", text: AMBER },
    "15-30": { base: "249,115,22", text: ORANGE },
    "30+": { base: "244,63,94", text: ROSE },
  };
  return (
    <View className="gap-4">
      <PanelCard
        title={t("analytics.sleeping.title")}
        icon={<MoonStar size={16} color={INDIGO} />}
        subtitle={t("analytics.sleeping.subtitle")}
      >
        {sleeping.length === 0 ? (
          <Text className="py-4 text-sm text-text-muted">{t("analytics.sleeping.empty")}</Text>
        ) : (
          <View className="gap-2">
            {sleeping.map((s) => {
              const tone = BUCKET[s.bucket];
              return (
                <View
                  key={s.projectId}
                  className="flex-row items-center justify-between gap-3 rounded-lg border border-border bg-bg px-3 py-2"
                >
                  <Text className="min-w-0 flex-1 text-sm text-text" numberOfLines={1}>
                    {s.name}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <View
                      className="rounded border px-1.5 py-0.5"
                      style={{
                        backgroundColor: `rgba(${tone.base},0.15)`,
                        borderColor: `rgba(${tone.base},0.3)`,
                      }}
                    >
                      <Text className="text-[10px]" style={{ color: tone.text }}>
                        {s.bucket}d
                      </Text>
                    </View>
                    <Text className="text-xs text-text-muted">{s.daysIdle}d</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </PanelCard>

      <PanelCard
        title={t("analytics.stale.title")}
        icon={<Lightbulb size={16} color={YELLOW} />}
        subtitle={t("analytics.stale.subtitle")}
      >
        {stale.length === 0 ? (
          <Text className="py-4 text-sm text-text-muted">{t("analytics.stale.empty")}</Text>
        ) : (
          <View className="gap-2">
            {stale.map((s) => (
              <View
                key={s.ideaId}
                className="flex-row items-center justify-between gap-3 rounded-lg border border-border bg-bg px-3 py-2"
              >
                <Text className="min-w-0 flex-1 text-sm text-text" numberOfLines={1}>
                  {s.title}
                </Text>
                <Text className="text-xs text-text-muted">{s.daysOld}d</Text>
              </View>
            ))}
          </View>
        )}
      </PanelCard>
    </View>
  );
}

export function IdeaFunnelPanel({ funnel, t, c }: { funnel: IdeaFunnel; t: T; c: ThemeColors }) {
  const pct = Math.round(funnel.promotionRate * 100);
  return (
    <PanelCard
      title={t("analytics.ideaFunnel.title")}
      icon={<ArrowRightCircle size={16} color={PINK} />}
      subtitle={t("analytics.ideaFunnel.subtitle")}
    >
      <View className="flex-row gap-3">
        <View className="flex-1 rounded-lg border border-border bg-bg p-3">
          <Text className="text-2xl font-semibold text-text">{funnel.ideasCreated}</Text>
          <Text className="mt-1 text-xs text-text-muted">{t("analytics.ideaFunnel.created")}</Text>
        </View>
        <View className="flex-1 rounded-lg border border-border bg-bg p-3">
          <Text className="text-2xl font-semibold" style={{ color: c.accent }}>
            {funnel.ideasPromoted}
          </Text>
          <Text className="mt-1 text-xs text-text-muted">{t("analytics.ideaFunnel.promoted")}</Text>
        </View>
        <View className="flex-1 rounded-lg border border-border bg-bg p-3">
          <Text className="text-2xl font-semibold text-text">
            {pct}
            <Text className="text-sm text-text-muted">%</Text>
          </Text>
          <Text className="mt-1 text-xs text-text-muted">{t("analytics.ideaFunnel.rate")}</Text>
        </View>
      </View>
    </PanelCard>
  );
}

export function EffortPanel({ effort, t }: { effort: EffortStats; t: T }) {
  const coverage = Math.round(effort.tasksWithEffortPct * 100);
  const subtitle = coverage >= 100 ? undefined : t("analytics.effort.subtitle", { coverage });
  return (
    <PanelCard
      title={t("analytics.effort.title")}
      icon={<Hourglass size={16} color={ORANGE} />}
      subtitle={subtitle}
    >
      <View className="mb-4 flex-row items-baseline gap-2">
        <Text className="text-3xl font-semibold text-text">{effort.effortHoursTotal}</Text>
        <Text className="text-sm text-text-muted">{t("analytics.effort.totalHoursSuffix")}</Text>
      </View>
      {effort.effortHoursByProject.length === 0 ? (
        <Text className="text-sm text-text-muted">{t("analytics.effort.empty")}</Text>
      ) : (
        <View className="gap-1.5">
          {effort.effortHoursByProject.map((row) => (
            <View key={row.projectId} className="flex-row items-center justify-between gap-3">
              <Text className="min-w-0 flex-1 text-sm text-text" numberOfLines={1}>
                {row.name}
              </Text>
              <Text className="text-sm text-text-muted">{row.hours} h</Text>
            </View>
          ))}
        </View>
      )}
    </PanelCard>
  );
}

/**
 * Componente raíz de la pantalla. Maneja el rango temporal y el chip activo, dispara
 * la carga vía useAnalyticsData(range) y pull-to-refresh. Solo se muestra un panel a
 * la vez (el del chip activo) para no saturar la vista móvil ni recalcular todos.
 */
