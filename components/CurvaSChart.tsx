/**
 * CurvaSChart — Gráfico de Curva S para avance físico acumulado.
 *
 * Stack: React 18 + TypeScript + Recharts 2 + Tailwind CSS v3
 *
 * Tokens CSS esperados en el design system (mapeo a clases Tailwind mediante
 * CSS variables del proyecto o el preset de Tailwind):
 *   --success          → serie Real (EV)
 *   --muted-foreground → serie Programado (PV) + texto secundario
 *   --accent           → ReferenceLine "HOY"
 *   --popover          → fondo del tooltip
 *   --border           → borde de card / grid
 *
 * Si tu Tailwind no tiene esos tokens, añade en tailwind.config.ts:
 *   theme.extend.colors.success = "var(--success)"
 *   ... etc.
 */

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CurvaSPoint {
  /** Etiqueta del eje X: "Ene", "Feb", "Sem 1", etc. */
  periodo: string;
  /** % avance físico programado ACUMULADO (0–100) */
  programado: number;
  /** % avance físico ejecutado ACUMULADO (0–100). null/undefined si aún no hay ejecución */
  real?: number | null;
}

export interface CurvaSChartProps {
  data: CurvaSPoint[];
  /** Periodo donde se traza la línea "HOY" (último con dato real) */
  periodoActual?: string;
  /** Default: "Curva S · Avance acumulado" */
  titulo?: string;
  /** Ej: "Comparativo programado vs ejecutado, corte DD/MM/AAAA" */
  subtitulo?: string;
}

// ─── Tooltip personalizado ────────────────────────────────────────────────────

interface TooltipPayloadItem {
  name: string;
  value: number | null | undefined;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-popover/95 backdrop-blur-sm px-3 py-2 shadow-lg min-w-[140px]">
      <p className="font-serif text-sm font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((item) => {
        if (item.value == null) return null;
        return (
          <div key={item.name} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground">{item.name}</span>
            <span className="font-mono font-medium ml-auto pl-2">
              {item.value.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ─── Legend personalizada (chips manuales en el header) ──────────────────────

interface LegendChipsProps {
  successColor: string;
  mutedColor: string;
}

const LegendChips: React.FC<LegendChipsProps> = ({ successColor, mutedColor }) => (
  <div className="flex items-center gap-4">
    {/* Programado — línea punteada */}
    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <svg width="24" height="8" viewBox="0 0 24 8" fill="none">
        <line
          x1="0" y1="4" x2="24" y2="4"
          stroke={mutedColor}
          strokeWidth="2"
          strokeDasharray="4 3"
        />
      </svg>
      Programado (PV)
    </span>
    {/* Real — línea sólida */}
    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <svg width="24" height="8" viewBox="0 0 24 8" fill="none">
        <line
          x1="0" y1="4" x2="24" y2="4"
          stroke={successColor}
          strokeWidth="2.5"
        />
        <circle cx="12" cy="4" r="3" fill={successColor} />
      </svg>
      Real (EV)
    </span>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const GRADIENT_ID = "curvaS-programado-fill";

export const CurvaSChart: React.FC<CurvaSChartProps> = ({
  data,
  periodoActual,
  titulo = "Curva S · Avance acumulado",
  subtitulo,
}) => {
  // Resuelve colores desde CSS variables en tiempo de ejecución
  const colors = useMemo(() => {
    const root = typeof window !== "undefined"
      ? getComputedStyle(document.documentElement)
      : null;
    const get = (v: string, fallback: string) =>
      root?.getPropertyValue(v).trim() || fallback;

    return {
      success:  get("--success",          "#0D7A5F"),
      muted:    get("--muted-foreground",  "#6B6560"),
      accent:   get("--accent",           "#C9952A"),
      border:   get("--border",           "#E3DED4"),
    };
  }, []);

  // Estado vacío — menos de 2 puntos
  if (data.length < 2) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 flex flex-col items-center justify-center gap-2 min-h-[120px] text-center">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="opacity-30">
          <path
            d="M4 24 Q10 18 16 14 Q22 10 28 8"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          />
          <circle cx="28" cy="8" r="2" fill="currentColor" />
        </svg>
        <p className="text-sm text-muted-foreground font-medium">
          Aún no hay suficientes periodos para graficar la Curva S
        </p>
        <p className="text-xs text-muted-foreground/60">
          Se necesitan al menos 2 periodos con datos programados.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-border">
        <div>
          <h3 className="font-serif text-[18px] font-semibold text-foreground leading-snug">
            {titulo}
          </h3>
          {subtitulo && (
            <p className="text-[12px] text-muted-foreground mt-0.5">{subtitulo}</p>
          )}
        </div>
        <LegendChips successColor={colors.success} mutedColor={colors.muted} />
      </div>

      {/* ── Chart ── */}
      <div className="px-2 py-3">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 24, left: 0, bottom: 4 }}
          >
            {/* Gradiente de relleno para el área Programado */}
            <defs>
              <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.muted} stopOpacity={0.25} />
                <stop offset="100%" stopColor={colors.muted} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              vertical={false}
              stroke={colors.border}
              strokeOpacity={0.5}
            />

            <XAxis
              dataKey="periodo"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: colors.muted }}
            />

            <YAxis
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: colors.muted }}
              tickFormatter={(v: number) => `${v}%`}
              width={38}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: colors.border, strokeWidth: 1, strokeDasharray: "4 2" }}
            />

            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, color: colors.muted, paddingTop: 8 }}
            />

            {/* ReferenceLine "HOY" */}
            {periodoActual && (
              <ReferenceLine
                x={periodoActual}
                stroke={colors.accent}
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{
                  value: "HOY",
                  position: "insideTopRight",
                  fontSize: 10,
                  fontWeight: 600,
                  fill: colors.accent,
                  offset: 4,
                }}
              />
            )}

            {/* Área Programado (PV) */}
            <Area
              type="monotone"
              dataKey="programado"
              name="Programado"
              stroke={colors.muted}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              fill={`url(#${GRADIENT_ID})`}
              dot={false}
              activeDot={{ r: 4, fill: colors.muted, strokeWidth: 0 }}
              connectNulls
            />

            {/* Línea Real ejecutado (EV) */}
            <Line
              type="monotone"
              dataKey="real"
              name="Real"
              stroke={colors.success}
              strokeWidth={2.5}
              dot={{ r: 4, fill: colors.success, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: colors.success, strokeWidth: 0 }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CurvaSChart;
