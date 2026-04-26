/**
 * Ejemplo de integración de CurvaSChart en la ficha de una inversión.
 *
 * Este archivo muestra:
 *  1. Cómo traer los cronogramas del backend.
 *  2. Cómo convertirlos al formato { periodo, programado, real }.
 *  3. La condición de renderizado (solo si hay ET + al menos 1 punto real).
 *
 * Stack: React 18 + TypeScript
 */

import React, { useEffect, useState } from "react";
import { CurvaSChart, CurvaSPoint } from "./CurvaSChart";

// ─── Tipos del dominio (ajustar a lo que devuelve tu backend) ─────────────────

interface CronogramaValorizado {
  /** Etiqueta del periodo: "Ene 2025", "Feb 2025", etc. */
  periodo: string;
  /** % físico programado INCREMENTAL para ese periodo */
  avance_fisico_programado_inc: number;
  /** % físico ejecutado INCREMENTAL. null si no hay dato aún. */
  avance_fisico_real_inc: number | null;
}

interface ExpedienteTecnico {
  id: string;
  cronograma_valorizado: CronogramaValorizado[];
  // ... otros campos
}

interface FichaInversionProps {
  cui: string;
}

// ─── Helper: incremental → acumulado ─────────────────────────────────────────

function toAcumulado(cronograma: CronogramaValorizado[]): CurvaSPoint[] {
  let accProg = 0;
  let accReal = 0;

  return cronograma.map((fila) => {
    accProg += fila.avance_fisico_programado_inc ?? 0;

    let real: number | null = null;
    if (fila.avance_fisico_real_inc != null) {
      accReal += fila.avance_fisico_real_inc;
      real = Math.min(accReal, 100); // no superar 100%
    }

    return {
      periodo: fila.periodo,
      programado: Math.min(accProg, 100),
      real,
    };
  });
}

// ─── Componente de ficha (fragmento) ─────────────────────────────────────────

export const FichaInversion: React.FC<FichaInversionProps> = ({ cui }) => {
  const [et, setEt] = useState<ExpedienteTecnico | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/expediente-tecnico?cui=${cui}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        setEt(data ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [cui]);

  // ── Construcción del data para CurvaSChart ──────────────────────────────
  const curvaSData: CurvaSPoint[] = React.useMemo(() => {
    if (!et?.cronograma_valorizado?.length) return [];
    return toAcumulado(et.cronograma_valorizado);
  }, [et]);

  // Último periodo con dato real → línea "HOY"
  const periodoActual = React.useMemo(() => {
    const conReal = [...curvaSData].reverse().find((p) => p.real != null);
    return conReal?.periodo;
  }, [curvaSData]);

  // Condición de renderizado:
  //   - Debe existir un expediente técnico.
  //   - Debe haber al menos 1 punto con real != null.
  const tieneEjdReal = curvaSData.some((p) => p.real != null);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando expediente...</p>;
  }

  return (
    <div className="space-y-6">
      {/* ... resto de la ficha ... */}

      {/* Curva S: solo si hay ET con al menos un periodo ejecutado */}
      {et && tieneEjdReal ? (
        <CurvaSChart
          data={curvaSData}
          periodoActual={periodoActual}
          titulo="Curva S · Avance acumulado"
          subtitulo={`Comparativo programado vs ejecutado${
            periodoActual ? ` — corte ${periodoActual}` : ""
          }`}
        />
      ) : (
        /* fallback: tabla/Excel existente — no se muestra el gráfico */
        <div className="text-sm text-muted-foreground italic">
          {et
            ? "Cronograma sin ejecución registrada — gráfico no disponible."
            : "Sin expediente técnico asociado — gráfico no disponible."}
        </div>
      )}
    </div>
  );
};
