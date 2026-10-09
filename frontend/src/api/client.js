export const API_BASE = 'http://localhost:5001';

/**
 * Upload and analyze chat log content with optional filename and user name.
 */
export async function analyzeChatLog(chatLog, filename = '', userName = '') {
  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ chatLog, filename, userName })
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || `Server error: ${response.status}`);
  }

  return data.analysis;
}
