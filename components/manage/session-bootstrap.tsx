"use client";

import { useCallback, useEffect, useState } from "react";

export function ManageSessionBootstrap({ aktif }: { aktif: boolean }) {
  const [status, setStatus] = useState<"idle" | "working" | "error">(aktif ? "working" : "idle");
  const [percobaan, setPercobaan] = useState(0);

  const tukar = useCallback(async () => {
    if (!aktif || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") ?? "";
    const id = window.location.pathname.split("/").filter(Boolean).at(-1) ?? "";
    if (!token || !/^[0-9a-f-]{36}$/i.test(id)) {
      setStatus("error");
      return;
    }

    setStatus("working");
    try {
      const response = await fetch("/api/v1/manage/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, token }),
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("exchange-failed");
      params.delete("token");
      const query = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, [aktif]);

  useEffect(() => {
    if (aktif) void tukar();
  }, [aktif, percobaan, tukar]);

  if (!aktif || status === "idle") return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-appbg/95 p-6" role={status === "error" ? "alert" : "status"}>
      <div className="max-w-sm rounded-md border border-line bg-surface p-5 text-center shadow-xl">
        <p className="font-semibold text-ink">
          {status === "working" ? "Mengamankan tautan pengelolaan…" : "Sesi pengelolaan belum siap"}
        </p>
        {status === "error" && (
          <>
            <p className="mt-2 text-sm text-ink-secondary">Periksa koneksi, lalu coba lagi. Tautan lama tetap tersimpan.</p>
            <button className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white" onClick={() => setPercobaan((n) => n + 1)}>
              Coba lagi
            </button>
          </>
        )}
      </div>
    </div>
  );
}
