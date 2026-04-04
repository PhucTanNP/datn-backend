const logger = {
  info: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    const location = getCallerLocation();
    console.log(`[${timestamp}] INFO: ${message}`, { location, ...meta });
  },

  error: (message, error = null, meta = {}) => {
    const timestamp = new Date().toISOString();
    const location = getCallerLocation();
    console.error(`[${timestamp}] ERROR: ${message}`, { location, error: error?.message, stack: error?.stack, ...meta });
  },

  warn: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    const location = getCallerLocation();
    console.warn(`[${timestamp}] WARN: ${message}`, { location, ...meta });
  },

  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      const location = getCallerLocation();
      console.debug(`[${timestamp}] DEBUG: ${message}`, { location, ...meta });
    }
  }
};

function getCallerLocation() {
  const error = new Error();
  const stack = error.stack.split('\n');
  // Find the caller that's not this file
  for (let i = 0; i < stack.length; i++) {
    const line = stack[i];
    if (line.includes('logger.js')) continue;
    if (line.includes('node:internal')) continue;
    // Extract file and line
    const match = line.match(/at (.+?)\s*\((.+?):(\d+):\d+\)/) || line.match(/at (.+?):(\d+):\d+/);
    if (match) {
      const func = match[1].split(' ')[0];
      const file = match[2] || match[1];
      const lineNum = match[3] || match[2];
      return `${file}:${lineNum} (${func})`;
    }
  }
  return 'unknown';
}

module.exports = logger;