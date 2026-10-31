/* Offline-first collector mode.
   While offline, pickups and hand-offs are saved in an outbox with an idempotency key.
   When the connection is back, the outbox is replayed in order. Nothing is dropped:
   a replay that fails stays in the list with the reason. (The "server" here is the browser store.) */

const isOffline = () => S.forceOffline || (typeof navigator !== "undefined" && navigator.onLine === false);

function newKey() {
  return globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function queueAction(type, args) {
  D.outbox = D.outbox || [];
  const item = { key: newKey(), type, args, at: Date.now(), by: S.user.id, status: "waiting", error: null, result: null };
  D.outbox.push(item);
  if (type === "pickup") {
    const req = D.requests.find((r) => r.id === args.reqId);
    if (req) req.offline = item.key;
  }
  return item;
}

async function syncOutbox() {
  D.applied = D.applied || [];
  const results = { synced: 0, failed: 0 };
  for (const item of (D.outbox || []).filter((x) => x.status === "waiting" || x.status === "failed")) {
    if (D.applied.includes(item.key)) { item.status = "synced"; continue; } // replayed twice: ignore the copy
    const who = user(item.by);
    try {
      if (item.type === "pickup") {
        const b = await confirmPickup(who, item.args.reqId, item.args.weight, new Date(item.at), undefined, item.args.householdCode);
        item.result = b.code;
      } else if (item.type === "handoff") {
        await send(who, item.args.code, item.args.to, new Date(item.at));
        item.result = item.args.code;
      }
      item.status = "synced";
      item.error = null;
      D.applied.push(item.key);
      results.synced++;
    } catch (e) {
      item.status = "failed";
      item.error = e.message;
      results.failed++;
    }
    const req = item.type === "pickup" ? D.requests.find((r) => r.id === item.args.reqId) : null;
    if (req && item.status === "synced") delete req.offline;
  }
  return results;
}

const outboxFor = (userId) => (D.outbox || []).filter((x) => x.by === userId);
