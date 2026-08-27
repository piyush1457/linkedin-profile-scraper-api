const config = require("../config");

class Cache {
  constructor(ttlSeconds) {
    this.ttlMs = (ttlSeconds || config.cache.ttlSeconds) * 1000;
    this.store = new Map();

    setInterval(() => this._evict(), this.ttlMs);
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.setAt > this.ttlMs) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value) {
    this.store.set(key, { value, setAt: Date.now() });
  }

  has(key) {
    return this.get(key) !== null;
  }

  _evict() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now - entry.setAt > this.ttlMs) {
        this.store.delete(key);
      }
    }
  }
}

const profileCache = new Cache();

module.exports = { Cache, profileCache };
