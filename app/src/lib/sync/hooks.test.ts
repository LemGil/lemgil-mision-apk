import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { db } from "../database";
import { setupHooks, nextVersion } from "./hooks";
import { setApplyingRemote } from "./queue";
import { getOutbox, getTombstones, getPendingCount } from "./queue";

const tick = () => new Promise((r) => setTimeout(r, 30));

describe("Ganchos de sincronización (Fase 1)", () => {
  beforeAll(async () => {
    await db.open();
    setupHooks();
  });

  beforeEach(async () => {
    await db.conversiones.clear();
    await db.syncQueue.clear();
    await db.syncTombstones.clear();
  });

  it("crear un registro lo encola y le pone version 1", async () => {
    await db.conversiones.add({ id: "t1", nombre: "Ana", estado: "Nuevo" } as any);
    await tick();
    const rec = await db.conversiones.get("t1");
    expect(rec?.version).toBe(1);
    expect(rec?.updatedAt).toBeTruthy();
    const outbox = await getOutbox();
    expect(outbox.some((e) => e.table === "conversiones" && e.recordId === "t1")).toBe(true);
  });

  it("actualizar un registro le sube la versión y lo encola", async () => {
    await db.conversiones.add({ id: "t2", nombre: "Beto", estado: "Nuevo" } as any);
    await tick();
    await db.syncQueue.clear(); // simula que ya se subió
    await db.conversiones.update("t2", { estado: "Bautizado" } as any);
    await tick();
    const rec = await db.conversiones.get("t2");
    expect(rec?.version).toBe(2);
    const outbox = await getOutbox();
    expect(outbox.some((e) => e.table === "conversiones" && e.recordId === "t2")).toBe(true);
    expect(nextVersion(null)).toBe(1);
    expect(nextVersion({ version: 5 })).toBe(6);
  });

  it("borrar un registro deja una tumba sin caducidad y limpia su cola", async () => {
    await db.conversiones.add({ id: "t3", nombre: "Celia", estado: "Nuevo" } as any);
    await tick();
    await db.conversiones.delete("t3");
    await tick();
    const tombs = await getTombstones();
    expect(tombs.some((t) => t.table === "conversiones" && t.recordId === "t3")).toBe(true);
    const outbox = await getOutbox();
    expect(outbox.some((e) => e.recordId === "t3")).toBe(false);
    expect(await getPendingCount()).toBeGreaterThan(0);
  });

  it("los cambios que vienen de la nube no se encolan ni suben versión", async () => {
    setApplyingRemote(true);
    try {
      await db.conversiones.add({ id: "t4", nombre: "Dora", estado: "Nuevo", version: 7 } as any);
      await tick();
      const rec = await db.conversiones.get("t4");
      expect(rec?.version).toBe(7);
      await db.conversiones.update("t4", { estado: "Integrado" } as any);
      await tick();
      const rec2 = await db.conversiones.get("t4");
      expect(rec2?.version).toBe(7);
      const outbox = await getOutbox();
      expect(outbox.some((e) => e.recordId === "t4")).toBe(false);
    } finally {
      setApplyingRemote(false);
    }
  });
});
