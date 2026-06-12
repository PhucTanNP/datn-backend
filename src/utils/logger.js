const logger = {
  info: (message, meta = {}) => {
    const ts = new Date().toISOString().slice(11, 19);
    const prefix = meta.tag ? `[${meta.tag}]` : '';
    console.log(`[${ts}]${prefix} ${message}`);
  },

  error: (message, error = null, meta = {}) => {
    const ts = new Date().toISOString().slice(11, 19);
    const prefix = meta.tag ? `[${meta.tag}]` : '';
    const errMsg = error?.message ? ` — ${error.message}` : '';
    console.error(`[${ts}]${prefix} ${message}${errMsg}`);
  },

  warn: (message, meta = {}) => {
    const ts = new Date().toISOString().slice(11, 19);
    const prefix = meta.tag ? `[${meta.tag}]` : '';
    console.warn(`[${ts}]${prefix} ${message}`);
  },

  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      const ts = new Date().toISOString().slice(11, 19);
      const prefix = meta.tag ? `[${meta.tag}]` : '';
      console.debug(`[${ts}]${prefix} ${message}`);
    }
  }
};

module.exports = logger;