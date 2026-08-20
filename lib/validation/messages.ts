/**
 * Translatable validation messages.
 *
 * THE PROBLEM. A Zod message is a plain `string`, and it has to survive two very different trips
 * before anyone reads it:
 *   - client: `zodResolver` → `fieldState.error.message`
 *   - server: Server Action → `ActionFailure.error.fieldErrors` (JSON over the wire) →
 *     `applyFieldErrors` → the same `error.message`
 * Neither trip can carry a `t()` call, and the schemas themselves are module-level constants
 * shared by both sides — there is no locale in scope where they are declared, and making every
 * schema a `(t) => schema` factory would break `zodResolver(schema)`, the exported field shapes
 * (`memberProfileCoreFields`, `socialLinkFields`, `buildProfileFields`) that other schemas
 * compose, and every Server Action that parses with the same constant.
 *
 * THE APPROACH. A schema's message is not the English sentence any more — it is an ENCODED
 * REFERENCE to a `validation.*` key in `messages/*.json`, plus any interpolation values. It is
 * still just a string, so both trips work unchanged. `useValidationMessage()` decodes it at the
 * only place a locale exists: render time, in the client component that shows it.
 *
 * The numeric limits stay in the code (`MAX_ROLE_TITLE_LENGTH` and friends) and travel as
 * `values` — deliberately NOT written into the translation strings, so bumping a constant can
 * never leave a message quoting the old number in one or both locales.
 */

/** Marker key; deliberately odd so it can't collide with a real message that happens to be JSON. */
const MARKER = '$v';

export type ValidationMessageValues = Record<string, string | number>;

export type DecodedValidationMessage = {
  /** Key under the `validation` namespace, e.g. `titleRequired`. */
  key: string;
  values?: ValidationMessageValues;
};

/**
 * Builds the encoded message a Zod rule carries. Use everywhere a schema in `lib/validation/`
 * declares user-facing copy:
 *
 * ```ts
 * .min(1, vmsg('titleRequired'))
 * .max(MAX_ROLE_TITLE_LENGTH, vmsg('titleMax', { max: MAX_ROLE_TITLE_LENGTH }))
 * ```
 *
 * NOT for server-only payload schemas (`lib/validation/email.ts`) — nobody renders those, and a
 * key would only make the server log harder to read than the sentence it replaced.
 */
export function vmsg(key: string, values?: ValidationMessageValues): string {
  return JSON.stringify(values ? { [MARKER]: key, values } : { [MARKER]: key });
}

/**
 * Inverse of {@link vmsg}. Returns `null` for anything that isn't an encoded message — a raw
 * sentence from `ActionError`, a Supabase error, a plain `z.string()` default — so callers can
 * fall back to showing it verbatim instead of swallowing it.
 */
export function decodeValidationMessage(raw: string): DecodedValidationMessage | null {
  // Cheap prefix test first: this runs on every message, most of which aren't encoded.
  if (!raw.startsWith(`{"${MARKER}":`)) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const record = parsed as Record<string, unknown>;
    const key = record[MARKER];
    if (typeof key !== 'string') return null;

    const values = record.values;
    return {
      key,
      values:
        typeof values === 'object' && values !== null
          ? (values as ValidationMessageValues)
          : undefined,
    };
  } catch {
    return null;
  }
}
