"use client";

import { useQuery } from "@tanstack/react-query";
import { Database, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useScene } from "@/store/scene";

export function DatasetSelector() {
  const datasetId = useScene((s) => s.datasetId);
  const setDatasetId = useScene((s) => s.setDatasetId);
  const setModel = useScene((s) => s.setModel);

  const { data: datasets } = useQuery({
    queryKey: ["datasets"],
    queryFn: api.datasets,
  });

  const { isFetching } = useQuery({
    queryKey: ["model", datasetId],
    queryFn: async () => {
      const modelData = await api.model(datasetId);
      setModel(modelData);
      return modelData;
    },
    enabled: Boolean(datasetId),
  });

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center">
        <Database className="absolute left-2.5 size-3.5 text-cyan-400 pointer-events-none" />
        <select
          value={datasetId}
          disabled={isFetching}
          onChange={(e) => setDatasetId(e.target.value)}
          className="h-8 rounded-md border border-white/10 bg-slate-900/90 pl-8 pr-7 text-xs font-medium text-slate-200 shadow-sm transition-colors hover:border-cyan-500/40 hover:bg-slate-800/90 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 disabled:opacity-50 appearance-none cursor-pointer"
        >
          {(datasets ?? [
            { id: "iris", name: "Iris Classification" },
            { id: "wine", name: "Wine Classification" },
            { id: "digits", name: "Digits Classification" },
            { id: "moons", name: "Two-Moons Classification" },
            { id: "circles", name: "Concentric Circles" },
          ]).map((ds) => (
            <option key={ds.id} value={ds.id} className="bg-slate-950 text-slate-200">
              {ds.name}
            </option>
          ))}
        </select>
        <span className="absolute right-2.5 pointer-events-none text-[10px] text-slate-400">
          ▾
        </span>
      </div>

      {isFetching && (
        <div className="flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] text-cyan-300 animate-pulse">
          <Loader2 className="size-3 animate-spin text-cyan-400" />
          <span>LOADING MODEL...</span>
        </div>
      )}
    </div>
  );
}
