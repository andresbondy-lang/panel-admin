if (typeof window !== "undefined" && !window.storage) {
  const call = async (method, body) => {
    try {
      const opts = { method, headers: { "Content-Type": "application/json" } };
      let url = "/api/storage";
      if (method === "GET") {
        url += `?key=${encodeURIComponent(body.key)}`;
      } else {
        opts.body = JSON.stringify(body);
      }
      const r = await fetch(url, opts);
      if (!r.ok) return null;
      return r.json();
    } catch {
      return null;
    }
  };

  window.storage = {
    async get(key) {
      const r = await call("GET", { key });
      if (!r || r.value === null || r.value === undefined) return null;
      return { key, value: r.value };
    },
    async set(key, value) {
      const r = await call("POST", { key, value });
      if (!r) return null;
      return { key, value };
    },
    async delete(key) {
      const r = await call("DELETE", { key });
      if (!r) return null;
      return { key, deleted: true };
    },
    async list() {
      return { keys: [] };
    },
  };
}
