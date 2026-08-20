'use client';

import { Slot } from '@radix-ui/react-slot';
import type { ComponentProps } from 'react';
import { createContext, useContext, useId } from 'react';
import type { ControllerProps, FieldPath, FieldValues } from 'react-hook-form';
import { Controller, FormProvider, useFormContext, useFormState, useWatch } from 'react-hook-form';

import { Label } from '@/components/ui/label';
import { useValidationMessage } from '@/components/ui/use-validation-message';
import { cn } from '@/lib/utils';
import { isLatinOnly, LATIN_ONLY_MESSAGE } from '@/lib/validation/common';

/**
 * Standard shadcn Form primitives, wired to React Hook Form. Pairs with
 * `@hookform/resolvers/zod` — the resolver + Zod schema stay in `lib/validation/`, these
 * components only own presentation/accessibility wiring (label ↔ control ↔ error).
 */
const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = createContext<FormFieldContextValue | null>(null);

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

type FormItemContextValue = {
  id: string;
};

const FormItemContext = createContext<FormItemContextValue | null>(null);

function useFormField() {
  const fieldContext = useContext(FormFieldContext);
  const itemContext = useContext(FormItemContext);
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: fieldContext?.name });

  if (!fieldContext || !itemContext) {
    throw new Error('useFormField must be used within <FormField> and <FormItem>.');
  }

  const fieldState = getFieldState(fieldContext.name, formState);
  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
}

function FormItem({ className, ...props }: ComponentProps<'div'>) {
  const id = useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div data-slot="form-item" className={cn('flex flex-col gap-1', className)} {...props} />
    </FormItemContext.Provider>
  );
}

function FormLabel({ className, ...props }: ComponentProps<typeof Label>) {
  const { error, formItemId } = useFormField();

  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={className}
      htmlFor={formItemId}
      {...props}
    />
  );
}

function FormControl({ ...props }: ComponentProps<typeof Slot>) {
  const { name, error, formItemId, formDescriptionId, formMessageId, invalid, isDirty } =
    useFormField();
  // Current field value — read directly (rather than trusting `isDirty` alone) so a freshly
  // APPENDED field (e.g. a new "Add role"/"Add expertise"/"Add number" card) never renders the
  // "valid" treatment while still empty: RHF marks an appended field dirty immediately, even
  // though the caller hasn't typed anything into it yet.
  const value = useWatch({ name });
  const hasValue = value != null && value !== '';
  // "Correctly filled" state for the shared Figma valid-field treatment (white border +
  // check icon on `Input`, white border only on `Textarea`/`Select`) — surfaced globally here
  // so every field wrapped in `FormControl` gets it without per-field wiring. Radix `Slot`
  // merges this non-DOM prop onto whichever child is rendered inside (e.g. `<Input />`),
  // which reads it itself and is the only place it's translated into DOM attributes/classes.
  const valid = isDirty && !invalid && hasValue;

  return (
    <Slot
      data-slot="form-control"
      id={formItemId}
      aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`}
      aria-invalid={!!error}
      {...{ valid }}
      {...props}
    />
  );
}

function FormDescription({ className, ...props }: ComponentProps<'p'>) {
  const { formDescriptionId } = useFormField();

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn('text-tiny text-muted-foreground', className)}
      {...props}
    />
  );
}

/** Leading icon for `FormMessage` — inherits `currentColor` so it matches the error text. */
function FormMessageIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M6 11C3.23857 11 1 8.7614 1 6C1 3.23857 3.23857 1 6 1C8.7614 1 11 3.23857 11 6C11 8.7614 8.7614 11 6 11ZM6 5.5C5.72386 5.5 5.5 5.72386 5.5 6V8C5.5 8.27614 5.72386 8.5 6 8.5C6.27614 8.5 6.5 8.27614 6.5 8V6C6.5 5.72386 6.27614 5.5 6 5.5ZM6 3.5C5.72386 3.5 5.5 3.72386 5.5 4C5.5 4.27614 5.72386 4.5 6 4.5C6.27614 4.5 6.5 4.27614 6.5 4C6.5 3.72386 6.27614 3.5 6 3.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

type FormMessageProps = ComponentProps<'p'> & {
  /**
   * Whether to run the live Latin-script check against this field's value (default `true`).
   *
   * Pass `false` for fields whose content is never rendered in the brand font and where a
   * character restriction would be actively harmful — i.e. PASSWORDS: silently telling someone
   * their existing password is "invalid" because it has Cyrillic in it would be wrong, and we
   * deliberately don't restrict what a password may contain.
   */
  latinOnly?: boolean;
};

function FormMessage({ className, children, latinOnly = true, ...props }: FormMessageProps) {
  const { error, name, formMessageId } = useFormField();
  // Schema messages arrive as encoded `validation.*` references (see `lib/validation/messages.ts`)
  // — from the client resolver AND from a Server Action's `fieldErrors` — and are turned into
  // locale text here, the first point in either path where a locale exists. Anything that isn't
  // an encoded reference (an `ActionError` sentence) passes through untouched.
  const tValidation = useValidationMessage();
  // Live (per-keystroke) counterpart to the Zod `isLatinOnly` rule on the schema side. Fields are
  // wired through `FormField`/`Controller`, so this re-renders as the caller types — the point of
  // running it here rather than leaving it to the resolver, which only speaks up on submit.
  // Non-string values (selects, arrays, files, numbers) are skipped rather than stringified.
  const value = useWatch({ name });
  const hasNonLatin = latinOnly && typeof value === 'string' && !isLatinOnly(value);

  // A resolver error still wins: it is the reason the submit failed, and once the caller edits
  // the field RHF re-validates on change — at which point the schema's own Latin rule surfaces
  // here anyway, with the identical message.
  const body = error
    ? tValidation(String(error.message ?? ''))
    : hasNonLatin
      ? tValidation(LATIN_ONLY_MESSAGE)
      : children;

  if (!body) {
    return null;
  }

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      role="alert"
      className={cn('flex items-center gap-1 text-[12px] font-normal text-destructive', className)}
      {...props}
    >
      <FormMessageIcon />
      {body}
    </p>
  );
}

export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
};
