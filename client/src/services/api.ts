
const API_BASE = '/api';

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string;[key: string]: any }> {
  try {
    const normalizedEndpoint = endpoint.startsWith('/')
      ? endpoint
      : `/${endpoint}`;

    const res = await fetch(`${API_BASE}${normalizedEndpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });

    const data = await res.json();

    return data;
  } catch (err: any) {
    console.error(`API request error on ${endpoint}:`, err);
    return {
      success: false,
      error: err.message || 'Network error occurred',
    };
  }
}
