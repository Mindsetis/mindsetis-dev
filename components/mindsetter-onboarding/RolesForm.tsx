'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Link2, Loader2, Pencil, Plus, Video } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import {
  type Control,
  useFieldArray,
  useForm,
  useFormContext,
  type UseFormReturn,
  useWatch,
} from 'react-hook-form';

import {
  fetchRoleLinkPreview,
  saveRoles,
} from '@/app/[locale]/(app)/mindsetter-onboarding/actions';
import { applyFieldErrors } from '@/components/auth/applyFieldErrors';
import { useSectionDirtyGuard } from '@/components/dashboard/unsaved-changes';
import { useCabinetSaved } from '@/components/dashboard/use-cabinet-saved';
import { CollapsibleCard, DeleteIcon } from '@/components/mindsetter-onboarding/CollapsibleCard';
import { SortableList } from '@/components/mindsetter-onboarding/SortableList';
import { StepActions } from '@/components/mindsetter-onboarding/StepActions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useValidationMessage } from '@/components/ui/use-validation-message';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { isLatinOnly, LATIN_ONLY_MESSAGE } from '@/lib/validation/common';
import {
  MAX_ROLE_DESCRIPTION_LENGTH,
  MAX_ROLE_LINK_TITLE_LENGTH,
  MAX_ROLE_LINKS,
  MAX_ROLE_TITLE_LENGTH,
  MAX_ROLES,
  type Role,
  type RoleLink,
  type RoleLinkMediaType,
  type RolesStepInput,
  rolesStepSchema,
} from '@/lib/validation/mindsetter';

type RolesFormProps = {
  /** Cabinet section-editor mode: swaps "Save & Continue" for "Back" + "Save & Next".
   * Omitted everywhere in the onboarding wizard, whose behavior is unchanged. */
  editMode?: boolean;
  /** Already-saved roles, when the caller revisits this step. */
  initialRoles?: Role[];
  /** Cabinet mode only: where "Save & Next" navigates once saved — the next card in cabinet
   * section order (`lib/profile/completeness.ts#nextSectionHref`, Release-1 C3). */
  nextHref?: string;
};

const EMPTY_ROLE: Role = { title: '', description: '', links: [] };

/** "Add link" button icon (16×16) — provided verbatim by the designer. Uses `currentColor` (per
 * product follow-up, 2026-07-19) so it tracks this `ghost`-variant button's own text color
 * (resting/hover/active), instead of a hardcoded fill. */
function AddLinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M7.33203 7.33301V3.99967C7.33203 3.63148 7.63051 3.33301 7.9987 3.33301C8.36689 3.33301 8.66536 3.63148 8.66536 3.99967V7.33301H11.9987C12.3669 7.33301 12.6654 7.63148 12.6654 7.99967C12.6654 8.36786 12.3669 8.66634 11.9987 8.66634H8.66536V11.9997C8.66536 12.3679 8.36689 12.6663 7.9987 12.6663C7.63051 12.6663 7.33203 12.3679 7.33203 11.9997V8.66634H3.9987C3.63051 8.66634 3.33203 8.36786 3.33203 7.99967C3.33203 7.63148 3.63051 7.33301 3.9987 7.33301H7.33203Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** "Remove link" icon (16×16) — provided verbatim by the designer, hardcoded `fill="white"` (not
 * `currentColor`); rendered inside the link input itself, 16px from its right edge (see the
 * `right-4` positioning below), mirroring the established `PasswordToggle`
 * (`components/auth/SignUpForm.tsx`) absolute-inside-input icon pattern. */
function RemoveLinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8.00045 7.05767L10.8289 4.22921C11.0893 3.96887 11.5114 3.96887 11.7717 4.22922C12.0321 4.48956 12.0321 4.91167 11.7717 5.17202L8.94325 8.00047L11.7717 10.8289C12.0321 11.0892 12.0321 11.5113 11.7717 11.7717C11.5114 12.032 11.0893 12.032 10.8289 11.7717L8.00045 8.94327L5.17203 11.7717C4.91168 12.032 4.48957 12.032 4.22923 11.7717C3.96887 11.5113 3.96887 11.0892 4.22922 10.8289L7.05765 8.00047L4.22922 5.17202C3.96887 4.91167 3.96887 4.48956 4.22922 4.22922C4.48957 3.96887 4.91168 3.96887 5.17203 4.22922L8.00045 7.05767Z"
        fill="white"
      />
    </svg>
  );
}

/** `true` only for a string that `fetchRoleLinkPreview` could plausibly fetch (http/https,
 * well-formed) — anything else (empty, `javascript:`, malformed) never triggers a server round
 * trip, mirroring the SSRF guard's own protocol allow-list in `lib/link-preview.ts` (that guard
 * still re-checks server-side; this is purely a client-side "don't bother calling" short-circuit,
 * not a security boundary). */
function isFetchableUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Best-effort hostname for the "no og:title yet — fall back to the domain" preview-card state
 * (product decision: never show a raw/invalid URL as the fallback title). `null` when `value`
 * isn't parseable as a URL at all. */
function getHostname(value: string): string | null {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

/**
 * One link's preview row — "a small dark icon box on the left + the page title" (design), e.g.
 * "Designing games with Canva — VCTR". `mediaType === 'video'` gets a video-camera icon; every
 * other type (article/link/unset) gets a generic link icon.
 * // TODO: swap the non-video type icon for the exact Figma SVG when provided.
 */
function LinkPreviewCard({
  title,
  mediaType,
  onTitleChange,
  editLabel,
}: {
  title: string;
  mediaType?: RoleLinkMediaType;
  /** Commits an edited title. Writes to the link's `ogTitle`, which is also what the public
   * profile renders — so the scraped title and a hand-written one are the same field, and the
   * member sees exactly the label their profile will show. */
  onTitleChange: (next: string) => void;
  editLabel: string;
}) {
  const Icon = mediaType === 'video' ? Video : Link2;
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(title);

  // This label is edited in a bare `<input>` inside the preview row, not through a
  // `FormField`/`FormMessage`, so the live Latin check the rest of the form gets for free is
  // wired here by hand. The row is a single compact line with nowhere to hang an error message,
  // so the feedback is the draft turning red as it is typed.
  const draftHasNonLatin = !isLatinOnly(draft);
  const tValidation = useValidationMessage();

  function commit() {
    setIsEditing(false);
    const next = draft.trim();
    // An emptied field falls back to the scraped/hostname title rather than saving a blank
    // label — a link with no visible text would be unclickable in practice. A non-Latin one
    // falls back the same way instead of writing a label the profile font can't draw.
    if (!next || next === title || !isLatinOnly(next)) {
      setDraft(title);
      return;
    }
    onTitleChange(next);
  }

  function cancel() {
    setDraft(title);
    setIsEditing(false);
  }

  return (
    <div className="flex items-center gap-2 rounded-[8px] border border-[#747474] bg-[#000] p-2">
      <span className="flex shrink-0 items-center justify-center rounded-[2px] bg-[#1a1a1a] px-[13px] py-[7px]">
        <Icon className="h-[10px] w-[14px]" aria-hidden="true" />
      </span>

      {isEditing ? (
        <input
          autoFocus
          value={draft}
          maxLength={MAX_ROLE_LINK_TITLE_LENGTH}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit();
            }
            if (event.key === 'Escape') cancel();
          }}
          aria-invalid={draftHasNonLatin}
          title={draftHasNonLatin ? tValidation(LATIN_ONLY_MESSAGE) : undefined}
          // Borderless and transparent so the row does not visibly change shape when it
          // flips between reading and editing.
          className={cn(
            'min-w-0 flex-1 bg-transparent text-[12px] font-medium outline-none',
            draftHasNonLatin ? 'text-destructive' : 'text-foreground',
          )}
        />
      ) : (
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">
          {title}
        </span>
      )}

      <button
        type="button"
        onClick={() => {
          if (isEditing) {
            commit();
            return;
          }
          // Seed from the CURRENT title on every entry, not once at mount: a later scrape can
          // replace `title` while this component stays mounted, and a stale draft would
          // silently overwrite the newer value.
          setDraft(title);
          setIsEditing(true);
        }}
        className="shrink-0 cursor-pointer text-muted-foreground transition-colors hover:text-primary"
      >
        <Pencil className="size-3.5" aria-hidden="true" />
        <span className="sr-only">{editLabel}</span>
      </button>
    </div>
  );
}

/** In-flight state for the same preview slot, shown while `fetchRoleLinkPreview` is running. */
function LinkPreviewLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-input p-3 text-muted-foreground">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-card">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      </span>
      <span className="truncate text-sm">{label}</span>
    </div>
  );
}

type RoleCardProps = {
  control: Control<RolesStepInput>;
  index: number;
  onRemove?: () => void;
  /** Sortable id (the `useFieldArray` field id) + whether this card can be reordered — the parent
   * wraps the list in `SortableList`; see `CollapsibleCard`. */
  id: string;
  draggable: boolean;
};

/**
 * One "Role N" card — Title (40-char counter), Description (auto-grow, 200-char counter),
 * and its own nested `links` field array. Split out of `RolesForm` because each card owns an
 * independent `useFieldArray` for its links (`roles.${index}.links`), which can't live in the
 * parent without one nested field-array hook per row. Wrapped in `CollapsibleCard` (stage 1.9
 * "collapse-on-blur") — collapses to a compact summary once title+description are filled AND the
 * caller clicks outside it.
 */
function RoleCard({ control, index, onRemove, id, draggable }: RoleCardProps) {
  const t = useTranslations('mindsetterOnboarding');
  // `control` (the prop) and this are the SAME `RolesForm` instance — `useFormContext` just
  // gives us `setValue`/`getValues`, which `useFieldArray`'s `control` alone doesn't expose.
  const { setValue, getValues } = useFormContext<RolesStepInput>();

  const {
    fields: linkFields,
    append: appendLink,
    remove: removeLink,
  } = useFieldArray({ control, name: `roles.${index}.links` });

  const titleValue = useWatch({ control, name: `roles.${index}.title` }) ?? '';
  const descriptionValue = useWatch({ control, name: `roles.${index}.description` }) ?? '';
  const linksValue = useWatch({ control, name: `roles.${index}.links` }) ?? [];
  const isFilled = titleValue.trim().length > 0 && descriptionValue.trim().length > 0;

  // Per-link in-flight state for `fetchRoleLinkPreview` — keyed by the link's stable
  // `useFieldArray` `field.id` (not its array index, which shifts when a sibling link is
  // removed). The preview DATA itself (`ogTitle`/`ogImage`/...) lives in the form (persisted on
  // save); this is purely ephemeral "is a fetch running right now" UI state.
  const [loadingLinks, setLoadingLinks] = useState<Record<string, boolean>>({});
  // The URL each link's CURRENTLY STORED preview (if any) corresponds to — lets `handleLinkBlur`
  // skip re-fetching when the field is blurred without having actually changed (e.g. tabbing
  // through), and lets `handleLinkUrlChange` know when to clear a now-stale preview. Seeded
  // lazily (see the `linkFields.map` below) from each link's value the first time it's seen —
  // correctly treats a prefilled link's saved URL as "already fetched" (doc requirement: prefill
  // shows its preview immediately, no re-fetch) and a brand-new "Add link" row's empty URL as
  // "nothing fetched yet".
  const fetchedUrlByLinkId = useRef<Record<string, string>>({});

  // Seeding happens here (an effect), NOT inline in the `linkFields.map` render below — mutating
  // a ref's `.current` during render is disallowed (React Compiler / `react-hooks/refs`). Reads
  // `linkField.url` (from `useFieldArray`'s OWN `fields`, i.e. each link's value as of when it was
  // registered — mount for a prefilled link, `appendLink({ url: '' })` for a brand-new one), not
  // the live-watched `linksValue`: `fields` only changes reference on a STRUCTURAL array change
  // (append/remove/move), which is exactly when a new field id needs seeding — an in-place edit to
  // an already-seeded link's `url` must NOT re-seed it (that's `handleLinkUrlChange`'s job). Each
  // entry is written at most once per field id (the `in` check), so this is idempotent.
  useEffect(() => {
    for (const linkField of linkFields) {
      if (!(linkField.id in fetchedUrlByLinkId.current)) {
        fetchedUrlByLinkId.current[linkField.id] = (linkField.url ?? '').trim();
      }
    }
  }, [linkFields]);

  function clearLinkPreview(linkIndex: number) {
    const current = getValues(`roles.${index}.links.${linkIndex}`);
    if (!current) return;
    if (
      !current.ogTitle &&
      !current.ogImage &&
      !current.mediaType &&
      !current.siteName &&
      !current.favicon
    ) {
      return; // already clear — skip redundant `setValue` calls.
    }
    setValue(`roles.${index}.links.${linkIndex}.ogTitle`, undefined, { shouldDirty: true });
    setValue(`roles.${index}.links.${linkIndex}.ogImage`, undefined, { shouldDirty: true });
    setValue(`roles.${index}.links.${linkIndex}.mediaType`, undefined, { shouldDirty: true });
    setValue(`roles.${index}.links.${linkIndex}.siteName`, undefined, { shouldDirty: true });
    setValue(`roles.${index}.links.${linkIndex}.favicon`, undefined, { shouldDirty: true });
  }

  /** Fired on every keystroke — clears a now-stale stored preview the moment the URL diverges
   * from whatever it was when that preview was fetched (product decision: don't wait for blur to
   * drop a stale card), without waiting for `handleLinkBlur` to actually re-fetch. */
  function handleLinkUrlChange(linkIndex: number, fieldId: string, rawValue: string) {
    const trimmed = rawValue.trim();
    if (fetchedUrlByLinkId.current[fieldId] === trimmed) return;
    clearLinkPreview(linkIndex);
  }

  /** Fired on blur — the actual `fetchRoleLinkPreview` round trip, only when the field holds a
   * non-empty, fetchable-looking URL that's genuinely different from what was last fetched. */
  async function handleLinkBlur(linkIndex: number, fieldId: string) {
    const link = getValues(`roles.${index}.links.${linkIndex}`);
    const url = link?.url?.trim();
    if (!url || !isFetchableUrl(url)) return;
    if (fetchedUrlByLinkId.current[fieldId] === url) return;

    setLoadingLinks((previous) => ({ ...previous, [fieldId]: true }));
    const result = await fetchRoleLinkPreview({ url });
    setLoadingLinks((previous) => {
      const next = { ...previous };
      delete next[fieldId];
      return next;
    });

    // Mark this URL as "fetched" regardless of outcome — a repeat blur on the same (still-failed)
    // URL shouldn't keep re-hitting the server; the client falls back to the domain-name display
    // either way (see `renderLinkPreview` below).
    fetchedUrlByLinkId.current[fieldId] = url;

    if (!result.ok || !result.data.preview) return;

    const { preview } = result.data;
    setValue(`roles.${index}.links.${linkIndex}.ogTitle`, preview.ogTitle, { shouldDirty: true });
    setValue(`roles.${index}.links.${linkIndex}.ogImage`, preview.ogImage, { shouldDirty: true });
    setValue(`roles.${index}.links.${linkIndex}.mediaType`, preview.mediaType, {
      shouldDirty: true,
    });
    setValue(`roles.${index}.links.${linkIndex}.siteName`, preview.siteName, {
      shouldDirty: true,
    });
    setValue(`roles.${index}.links.${linkIndex}.favicon`, preview.favicon, { shouldDirty: true });
  }

  /** Renders the compact preview row below a link's URL input, or nothing at all — see the
   * component doc comment on `LinkPreviewCard` for the design this matches. Falls back to the
   * URL's own hostname when `ogTitle` never resolved (no scrape yet, or the scrape came back
   * empty); shows nothing at all for an unparsable URL, per product decision. */
  function renderLinkPreview(link: RoleLink | undefined, linkIndex: number, isLoading: boolean) {
    if (isLoading) return <LinkPreviewLoading label={t('roles.linkPreviewLoading')} />;

    const url = link?.url?.trim();
    if (!url) return null;

    // The hostname fallback is shown when no scrape has landed — and is equally editable, so a
    // member whose site has no og:title can still give the link a readable label instead of
    // publishing a bare domain.
    const displayTitle = link?.ogTitle || getHostname(url);
    if (!displayTitle) return null;

    return (
      <LinkPreviewCard
        title={displayTitle}
        mediaType={link?.mediaType}
        editLabel={t('roles.editLinkTitle')}
        onTitleChange={(next) =>
          setValue(`roles.${index}.links.${linkIndex}.ogTitle`, next, { shouldDirty: true })
        }
      />
    );
  }

  return (
    <CollapsibleCard
      isFilled={isFilled}
      title={
        <span className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
          {t('roles.roleCardTitle', { index: index + 1 })}
        </span>
      }
      onDelete={onRemove}
      deleteLabel={t('roles.removeRole')}
      editLabel={t('common.edit')}
      reorderLabel={t('common.reorder')}
      id={id}
      draggable={draggable}
      collapsedSummary={
        <div className="flex flex-col gap-2">
          <p className="truncate text-tiny font-bold tracking-[0.3em] text-foreground uppercase">
            {titleValue}
          </p>
          {descriptionValue ? (
            <p className="line-clamp-2 text-tiny text-muted-foreground">{descriptionValue}</p>
          ) : null}
          {linksValue.length > 0 ? (
            <div className="flex flex-col gap-1">
              {linksValue
                .map((link) => link?.url)
                .filter(Boolean)
                .map((url) => (
                  <p key={url} className="truncate text-tiny text-muted-foreground">
                    {url}
                  </p>
                ))}
            </div>
          ) : null}
        </div>
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-tiny font-bold tracking-[0.3em] text-muted-foreground uppercase">
          {t('roles.roleCardTitle', { index: index + 1 })}
        </span>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('roles.removeRole')}
            className="cursor-pointer"
          >
            <DeleteIcon />
          </button>
        ) : null}
      </div>

      <FormField
        control={control}
        name={`roles.${index}.title`}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between gap-2">
              <FormLabel>
                <span className="inline-flex items-center gap-1">
                  {t('roles.titleLabel')} <span className="text-primary">*</span>
                </span>
              </FormLabel>
              <span className="text-tiny text-muted-foreground">
                {t('common.charCount', { count: titleValue.length, max: MAX_ROLE_TITLE_LENGTH })}
              </span>
            </div>
            <FormControl>
              <Input
                type="text"
                maxLength={MAX_ROLE_TITLE_LENGTH}
                placeholder={t('roles.titlePlaceholder')}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`roles.${index}.description`}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between gap-2">
              <FormLabel>
                <span className="inline-flex items-center gap-1">
                  {t('roles.descriptionLabel')} <span className="text-primary">*</span>
                </span>
              </FormLabel>
              <span className="text-tiny text-muted-foreground">
                {t('common.charCount', {
                  count: descriptionValue.length,
                  max: MAX_ROLE_DESCRIPTION_LENGTH,
                })}
              </span>
            </div>
            <FormControl>
              <Textarea
                autoGrow
                maxLength={MAX_ROLE_DESCRIPTION_LENGTH}
                placeholder={t('roles.descriptionPlaceholder', {
                  max: MAX_ROLE_DESCRIPTION_LENGTH,
                })}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex flex-col gap-2">
        {linkFields.map((linkField, linkIndex) => {
          const link = linksValue[linkIndex];
          const isLoading = !!loadingLinks[linkField.id];

          return (
            <div key={linkField.id} className="flex flex-col gap-1">
              <FormField
                control={control}
                name={`roles.${index}.links.${linkIndex}.url`}
                render={({ field, fieldState }) => (
                  <FormItem>
                    {/* Deliberately NOT wrapped in `FormControl` — a link row is an optional,
                        freely-removable chip (the trailing remove icon below), not a "fill this
                        in correctly" field, so it must never show the shared valid/check
                        treatment (`FormControl` is what supplies that `valid` prop to `Input`).
                        Rendering `Input` directly here, with its own `aria-invalid`, keeps the
                        remove icon as the only trailing icon this row ever shows. The remove
                        button sits INSIDE the input, 16px from its right edge (`right-4`),
                        mirroring `SignUpForm.tsx`'s `PasswordToggle` pattern — `pr-11` on the
                        input reserves room for it. */}
                    <div className="relative">
                      <Input
                        type="url"
                        className="pr-11"
                        placeholder={t('roles.linkPlaceholder')}
                        aria-invalid={!!fieldState.error}
                        {...field}
                        onChange={(event) => {
                          field.onChange(event);
                          handleLinkUrlChange(linkIndex, linkField.id, event.target.value);
                        }}
                        onBlur={() => {
                          field.onBlur();
                          void handleLinkBlur(linkIndex, linkField.id);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeLink(linkIndex)}
                        aria-label={t('roles.removeLink')}
                        className="absolute top-1/2 right-4 -translate-y-1/2 cursor-pointer"
                      >
                        <RemoveLinkIcon />
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {renderLinkPreview(link, linkIndex, isLoading)}
            </div>
          );
        })}

        {linkFields.length < MAX_ROLE_LINKS ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-center"
            onClick={() => appendLink({ url: '' })}
          >
            <AddLinkIcon />
            {t('roles.addLink')}
          </Button>
        ) : null}
      </div>
    </CollapsibleCard>
  );
}

/**
 * Extended Mindsetter onboarding — step 1/5 "Your roles" form (see `page.tsx`). Mirrors
 * `MemberProfileForm.tsx`'s structure (RHF + `zodResolver`, `applyFieldErrors`), plus a
 * `useFieldArray` of Role cards (each with its own nested links field array, see `RoleCard`).
 */
export function RolesForm({ initialRoles, editMode, nextHref }: RolesFormProps) {
  const t = useTranslations('mindsetterOnboarding');
  const router = useRouter();
  const notifySaved = useCabinetSaved();
  const [formError, setFormError] = useState<string | null>(null);

  const form: UseFormReturn<RolesStepInput> = useForm<RolesStepInput>({
    resolver: zodResolver(rolesStepSchema),
    mode: 'onChange',
    defaultValues: {
      roles: initialRoles?.length ? initialRoles : [EMPTY_ROLE],
    },
  });

  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: 'roles' });

  // Reported up to the shared "unsaved changes" guard (Release-1 C-continuation, 2026-09-19), but
  // only in cabinet mode — this form is also the wizard's own step, which must stay unaffected by
  // the cabinet's exit guard (see that hook's own doc comment).
  useSectionDirtyGuard(editMode ? form.formState.isDirty : false);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    const result = await saveRoles(values);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.error.fieldErrors);
      setFormError(result.error.message);
      return;
    }

    // Step 2/5 — "Your superpowers" (not built yet in this foundation slice; wired ahead of
    // the route existing, same precedent as the Member wizard's earlier steps).
    // Cabinet mode walks to the next section ("Save & Next"); the wizard continues to step 2/5.
    if (editMode) {
      form.reset(values);
      notifySaved(nextHref);
      return;
    }

    router.push('/mindsetter-onboarding/superpowers');
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 md:gap-6">
        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <SortableList ids={fields.map((field) => field.id)} onReorder={move}>
          <div className="flex flex-col gap-3 md:gap-4">
            {fields.map((field, index) => (
              <RoleCard
                key={field.id}
                id={field.id}
                control={form.control}
                index={index}
                onRemove={fields.length > 1 ? () => remove(index) : undefined}
                draggable={fields.length > 1}
              />
            ))}
          </div>
        </SortableList>

        {fields.length < MAX_ROLES ? (
          <Button type="button" variant="outline" size="lg" onClick={() => append(EMPTY_ROLE)}>
            <Plus className="size-4" aria-hidden="true" />
            {t('roles.addRole')}
          </Button>
        ) : null}

        {/* Direct child of the `<form>`, NOT wrapped with the "Add role" button above (as it was
            until 2026-09-20): the cabinet bar is `position: sticky`, and sticky can only travel
            inside its own containing block. Boxed into that two-row wrapper it had ~70px of room,
            so it never actually pinned — measured live at 375px, where the section is long enough
            that the buttons should have been held at the bottom edge the whole way down. Every
            other section form already renders it here for the same reason. */}
        <StepActions
          onCancel={() => router.push('/dashboard/profile')}
          editMode={editMode}
          isSubmitting={form.formState.isSubmitting}
        />
      </form>
    </Form>
  );
}
