'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { submitHelpSupport } from '@/app/[locale]/(app)/support/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { cn } from '@/lib/utils';
import {
  type HelpSupportFormInput,
  helpSupportFormSchema,
  MAX_SUPPORT_MESSAGE_LENGTH,
  MAX_SUPPORT_PAGE_LENGTH,
} from '@/lib/validation/help-support';

type HelpSupportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The account's email — prefills the "Your email" field (the user can change it). */
  email: string;
};

/**
 * "Help & Support" modal, opened from the three account menus (mobile sheet, desktop dropdown,
 * cabinet sidebar). Controlled, so each menu keeps its own `open` flag and the user stays on
 * the page they were on — nothing here navigates.
 *
 * FULL-SCREEN below `md`, a centred card from `md` up. The form lives in an inner component that
 * Radix only mounts while the dialog is open, so every opening starts from a clean form and the
 * account's email, with no reset bookkeeping.
 */
export function HelpSupportDialog({ open, onOpenChange, email }: HelpSupportDialogProps) {
  const t = useTranslations('support.helpDialog');
  const tCommon = useTranslations('common');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        // From `md` start in the message field (the email is prefilled, so that's where typing
        // begins) instead of Radix's default first focusable — the close button. Phones keep the
        // default: focusing a textarea there throws the keyboard over the full-screen form at once.
        onOpenAutoFocus={(event) => {
          if (!window.matchMedia('(min-width: 768px)').matches) return;
          const message = (event.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>(
            'textarea[name="message"]',
          );
          if (!message) return;
          event.preventDefault();
          message.focus();
        }}
        className={cn(
          // Phones: cover the whole viewport (`dvh` keeps it clear of the mobile browser bars).
          'max-md:top-0 max-md:left-0 max-md:h-dvh max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none max-md:border-0',
          // md+: the same centred card the project's other form dialogs use.
          'gap-5 overflow-y-auto bg-card p-6 md:max-h-[90vh] md:max-w-[520px] md:rounded-[18px] md:p-7',
          'md:shadow-[0px_24px_60px_rgba(0,0,0,0.55)]',
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <DialogTitle className="text-m leading-[29px] font-normal text-foreground">
              {t('title')}
            </DialogTitle>
            <DialogDescription className="text-tiny">{t('subtitle')}</DialogDescription>
          </div>
          <DialogCloseButton label={tCommon('closeDialog')} />
        </div>

        <HelpSupportForm email={email} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function HelpSupportForm({ email, onDone }: { email: string; onDone: () => void }) {
  const t = useTranslations('support.helpDialog');
  const tCommon = useTranslations('common');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<HelpSupportFormInput>({
    resolver: zodResolver(helpSupportFormSchema),
    // Errors only after the first "Send message", then live while correcting (Release 4 П10,
    // owner's test 06.11.2026). `onTouched` showed "Please enter your message." the moment the
    // dialog opened whenever focus briefly left the field during opening.
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: { email, message: '' },
  });
  // `isSubmitting` stays true for the whole async submit, which is what locks the button.
  const { isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const page = (window.location.pathname + window.location.search).slice(
      0,
      MAX_SUPPORT_PAGE_LENGTH,
    );

    let result;
    try {
      result = await submitHelpSupport({ ...values, page });
    } catch {
      setFormError(t('error'));
      return;
    }

    if (!result.ok) {
      setFormError(result.error.code === 'rate_limited' ? t('tooMany') : t('error'));
      return;
    }
    setSentTo(values.email.trim().toLowerCase());
  });

  if (sentTo) {
    return (
      <div className="flex flex-col gap-5">
        <p role="status" className="text-base text-foreground">
          {t('success', { email: sentTo })}
        </p>
        <Button type="button" size="lg" className="w-full md:w-auto md:self-end" onClick={onDone}>
          {tCommon('closeDialog')}
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => void onSubmit(event)}
        noValidate
        aria-busy={isSubmitting}
        className="flex flex-col gap-4"
      >
        {formError ? (
          <p role="alert" className="text-sm text-error">
            {formError}
          </p>
        ) : null}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('emailLabel')}</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              {/* `latinOnly={false}`: an email is not display copy, and the message below is the
                  user's own words to the team — the brand-font Latin-only rule must not apply. */}
              <FormMessage latinOnly={false} />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('messageLabel')}</FormLabel>
              <FormControl>
                <Textarea
                  rows={6}
                  maxLength={MAX_SUPPORT_MESSAGE_LENGTH}
                  placeholder={t('messagePlaceholder')}
                  className="min-h-[140px]"
                  {...field}
                />
              </FormControl>
              <FormMessage latinOnly={false} />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full md:w-auto md:self-end"
          disabled={isSubmitting}
        >
          {t('send')}
        </Button>
      </form>
    </Form>
  );
}
