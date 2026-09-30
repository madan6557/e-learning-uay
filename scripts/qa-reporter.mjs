// Node's structured test events avoid parsing human-oriented TAP output.
function errorData(error) {
  if (!error) return null;
  return {
    message: error.message,
    code: error.code,
    failureType: error.failureType,
    actual: error.actual,
    expected: error.expected,
    operator: error.operator,
    stack: error.stack,
    cause: error.cause ? errorData(error.cause) : null,
  };
}
export default async function* reporter(events) {
  for await (const event of events) {
    if (!["test:pass", "test:fail", "test:diagnostic"].includes(event.type))
      continue;
    const data = event.data;
    yield JSON.stringify({
      event: event.type,
      name: data.name ?? "",
      file: data.file ?? "",
      line: data.line ?? null,
      nesting: data.nesting ?? 0,
      durationMs: data.details?.duration_ms ?? 0,
      skipped: !!data.skip,
      todo: !!data.todo,
      message: data.message ?? "",
      error: errorData(data.details?.error),
    }) + "\n";
  }
}
