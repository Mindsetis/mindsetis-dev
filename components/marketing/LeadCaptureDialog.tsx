'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { captureLead } from '@/app/[locale]/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { toast } from '@/components/ui/sonner';
import { type LeadFormInput, leadFormSchema } from '@/lib/validation/leads';

/**
 * "I'm on the way" escape hatch (spec §5.2) — a lightweight, low-commitment affordance for
 * visitors who are not ready to complete the full registration wizard. Sits as a small
 * secondary link next to the hero's primary Continue CTA (`HeroEmailCta`, rendered by
 * `HeroSection`); opens a minimal name+email form that writes straight to the `leads` table
 * via `captureLead` — independent of, and never routing into, `/sign-up`.
 *
 * No dedicated Figma frame for this flow (confirmed with product 2026-07-14, see ROADMAP
 * 1.3) — deliberate UI freedom, hence the `Dialog` treatment rather than a bespoke layout.
 */
export function LeadCaptureDialog() {
  const t = useTranslations('home.hero.imOnTheWay');
  const [open, setOpen] = useState(false);

  const form = useForm<LeadFormInput>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: { name: '', email: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await captureLead(values);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success(t('success'));
    form.reset();
    setOpen(false);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="link" className="mx-auto">
          {t('trigger')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('nameLabel')}</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" placeholder={t('namePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('emailLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder={t('emailPlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                loading={form.formState.isSubmitting}
              >
                {t('submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
