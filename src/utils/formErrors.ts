export function firstErrorPerField(
  payload: Record<string, string[]>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(payload).map(([field, messages]) => [
      field,
      messages[0] ?? 'Перевірте значення',
    ]),
  );
}
