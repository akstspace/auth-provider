interface ErrorWithMessage {
  message?: string;
  code?: string;
  error?: unknown;
  cause?: unknown;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readErrorFields = (value: unknown): ErrorWithMessage | null => {
  if (!isObject(value)) return null;

  const message = typeof value.message === "string" ? value.message : undefined;
  const code = typeof value.code === "string" ? value.code : undefined;

  return {
    message,
    code,
    error: value.error,
    cause: value.cause,
  };
};

const findBetterAuthField = (
  value: unknown,
  selectField: (fields: ErrorWithMessage) => string | undefined,
  depth = 0,
): string | null => {
  if (depth > 4) return null;

  const direct = readErrorFields(value);
  if (!direct) return null;

  const selected = selectField(direct);
  if (selected) return selected;

  return (
    findBetterAuthField(direct.error, selectField, depth + 1) ||
    findBetterAuthField(direct.cause, selectField, depth + 1)
  );
};

export const getAuthErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  const nestedMessage = findBetterAuthField(error, (fields) => fields.message);
  if (nestedMessage) return nestedMessage;

  const nestedCode = findBetterAuthField(error, (fields) => fields.code);
  if (nestedCode) return nestedCode;

  if (error instanceof Error && error.message) return error.message;

  const errorFields = readErrorFields(error);
  if (errorFields?.code) return errorFields.code;

  return fallback;
};

export const getAuthErrorCode = (error: unknown): string | null => {
  const nestedCode = findBetterAuthField(error, (fields) => fields.code);
  if (nestedCode) return nestedCode;

  const errorFields = readErrorFields(error);
  if (errorFields?.code) return errorFields.code;

  return null;
};
