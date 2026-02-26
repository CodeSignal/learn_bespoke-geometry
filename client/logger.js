/**
 * Fire-and-forget logging of user actions to the server (POST /log).
 * Does not block UX; errors are swallowed.
 * @param {string} message - Line to append to logs/user_actions.log
 */
export function logAction(message) {
  try {
    const url = new URL('/log', window.location.origin);
    fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: String(message) })
    }).catch(() => {});
  } catch (_) {}
}
