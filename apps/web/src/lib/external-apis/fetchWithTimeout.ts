type FetchArgs = Parameters<typeof fetch>;

export async function fetchWithTimeout(
  input: FetchArgs[0],
  init: (FetchArgs[1] & { timeoutMs?: number }) | undefined = undefined
) {
  const timeoutMs = init?.timeoutMs ?? 7000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: init?.signal ?? controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}
