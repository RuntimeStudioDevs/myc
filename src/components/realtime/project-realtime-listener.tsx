"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const DEBOUNCE_MS = 2000;
const MAX_IDS_PER_CHUNK = 100;

interface Props {
  projectIds: string[];
  updateIds?: string[];
}

/**
 * Componente cliente que se suscribe a cambios en las tablas
 * del dominio via Supabase Realtime. Al detectar un cambio relevante,
 * ejecuta router.refresh() para revalidar los Server Components.
 *
 * Solo usa Realtime como senal de cambio. No renderiza datos
 * del payload — todas las queries se ejecutan en servidor con
 * validaciones de permisos y RLS.
 */
export default function ProjectRealtimeListener({
  projectIds,
  updateIds,
}: Props) {
  const router = useRouter();
  const lastRefreshRef = useRef(0);
  const projectIdsRef = useRef(projectIds);
  const updateIdsRef = useRef(updateIds);

  useEffect(() => {
    projectIdsRef.current = projectIds;
  }, [projectIds]);

  useEffect(() => {
    updateIdsRef.current = updateIds;
  }, [updateIds]);

  useEffect(() => {
    if (projectIds.length === 0) return;

    const supabase = createClient();
    const channels = supabase.channel("project-changes");
    const scheduled = { current: false };

    const scheduleRefresh = () => {
      if (scheduled.current) return;
      scheduled.current = true;

      const now = Date.now();
      const elapsed = now - lastRefreshRef.current;
      const delay = elapsed < DEBOUNCE_MS ? DEBOUNCE_MS - elapsed : 0;

      setTimeout(() => {
        scheduled.current = false;
        lastRefreshRef.current = Date.now();
        router.refresh();
      }, delay);
    };

    const handleChange = () => {
      scheduleRefresh();
    };

    const dedupedProjectIds = [...new Set(projectIds)].filter(Boolean);

    const projectFilter = dedupedProjectIds
      .map((id) => `obra_id=eq.${id}`)
      .join(",");
    const directTables = [
      "actualizaciones_obra",
      "comentarios_obra",
      "archivos_obra",
      "historial_estado_obra",
    ];

    for (const table of directTables) {
      channels.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: projectFilter },
        handleChange,
      );
    }

    const obrasFilter = dedupedProjectIds
      .map((id) => `id=eq.${id}`)
      .join(",");
    channels.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "obras", filter: obrasFilter },
      handleChange,
    );

    if (updateIds && updateIds.length > 0) {
      const deduped = [...new Set(updateIds)].filter(Boolean);

      for (let i = 0; i < deduped.length; i += MAX_IDS_PER_CHUNK) {
        const chunk = deduped.slice(i, i + MAX_IDS_PER_CHUNK);
        const filter = `actualizacion_id=in.(${chunk.join(",")})`;

        channels.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "comentarios_actualizacion",
            filter,
          },
          handleChange,
        );

        channels.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "archivos_actualizacion",
            filter,
          },
          handleChange,
        );
      }
    }

    channels.subscribe((status, err) => {
      if (err) {
        console.error("Realtime subscription error:", err);
      }
    });

    return () => {
      supabase.removeChannel(channels).catch(() => {});
    };
  }, [projectIds, updateIds, router]);

  return null;
}
