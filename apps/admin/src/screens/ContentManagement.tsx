import { Plus, Sparkles, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { POST_CATEGORIES, type PostCategory } from '@stitch/constants';

import { PageHeader } from '@/components/PageHeader';
import { StatusPill } from '@/components/StatusPill';
import type { AdminFeedItem, AdminPost, AdminReel } from '@/lib/types';
import { useFeedStore } from '@/stores/feedStore';

type Kind = 'post' | 'event' | 'reel';

interface DraftState {
  kind: Kind;
  category: PostCategory;
  caption: string;
  title: string;
  subtitle: string;
  emoji: string;
  bg: string;
  imageUrl: string;
  pinned: boolean;
  description: string;
  visualKind: AdminReel['visualKind'];
}

const emptyDraft: DraftState = {
  kind: 'post',
  category: 'announcements',
  caption: '',
  title: '',
  subtitle: '',
  emoji: '📢',
  bg: '#7C3AED',
  imageUrl: '',
  pinned: false,
  description: '',
  visualKind: 'water',
};

const VISUALS: AdminReel['visualKind'][] = ['water', 'zen', 'fire', 'leaves', 'sparkle'];

function fmt(iso: string, lang: string): string {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function ContentManagement() {
  const { t, i18n } = useTranslation();
  const items = useFeedStore((s) => s.items);
  const publishPost = useFeedStore((s) => s.publishPost);
  const publishReel = useFeedStore((s) => s.publishReel);
  const remove = useFeedStore((s) => s.remove);

  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo<AdminFeedItem[]>(
    () =>
      [...items].sort((a, b) =>
        a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0,
      ),
    [items],
  );

  const canPublish =
    draft.kind === 'reel'
      ? draft.title.trim().length > 0 && draft.description.trim().length > 0
      : draft.caption.trim().length > 0 && draft.title.trim().length > 0;

  const handlePublish = async () => {
    if (!canPublish || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (draft.kind === 'reel') {
        await publishReel({
          kind: 'reel',
          category: draft.category,
          title: draft.title.trim(),
          description: draft.description.trim(),
          visualKind: draft.visualKind,
          authorName: 'Madinet Masr Management',
        });
      } else {
        await publishPost({
          kind: 'post',
          category: draft.category,
          caption: draft.caption.trim(),
          slides: [
            {
              bg: draft.bg,
              emoji: draft.emoji,
              title: draft.title.trim(),
              sub: draft.subtitle.trim() || undefined,
              ...(draft.imageUrl.trim() ? { imageUrl: draft.imageUrl.trim() } : {}),
            },
          ],
          pinned: draft.pinned,
          isEvent: draft.kind === 'event',
          authorName: 'Madinet Masr Management',
        });
      }
      setDraft(emptyDraft);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('content.title')}
        subtitle={t('content.subtitle')}
        action={
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold"
          >
            <Plus size={16} />
            <span>{t('content.newPost')}</span>
          </button>
        }
      />

      <div className="bg-white rounded-2xl border border-ink-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-ink-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-start font-semibold px-4 py-3">{t('content.table.title')}</th>
              <th className="text-start font-semibold px-4 py-3">{t('content.table.kind')}</th>
              <th className="text-start font-semibold px-4 py-3">{t('content.table.category')}</th>
              <th className="text-start font-semibold px-4 py-3">{t('content.table.status')}</th>
              <th className="text-start font-semibold px-4 py-3">{t('content.table.published')}</th>
              <th className="text-end font-semibold px-4 py-3">{t('content.table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-500">
                  {t('common.empty')}
                </td>
              </tr>
            ) : (
              sorted.map((item) => {
                const title =
                  item.kind === 'reel' ? item.title : (item as AdminPost).slides[0]?.title;
                return (
                  <tr key={item.id} className="border-t border-ink-100">
                    <td className="px-4 py-3 font-medium text-ink-900 max-w-xs truncate">
                      {title}
                    </td>
                    <td className="px-4 py-3 text-ink-700">
                      {item.kind === 'reel'
                        ? t('content.kind.reel')
                        : (item as AdminPost).isEvent
                          ? t('content.kind.event')
                          : t('content.kind.post')}
                    </td>
                    <td className="px-4 py-3 text-ink-700">
                      {t(`content.categories.${item.category}`)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={item.status === 'live' ? 'success' : 'warning'}>
                        {t(`content.status.${item.status}`)}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3 text-ink-500 tabular-nums">
                      {fmt(item.publishedAt, i18n.language)}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        className="inline-flex items-center gap-1 text-xs text-danger hover:underline"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-xl bg-white rounded-2xl border border-ink-200 shadow-xl">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-100">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-brand-500" />
                <h2 className="text-sm font-bold text-ink-900">{t('content.newPost')}</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-ink-100 text-ink-500"
                aria-label={t('common.cancel')}
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
              {error && (
                <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {error}
                </div>
              )}
              <Field label={t('content.form.kind')}>
                <div className="flex gap-2">
                  {(['post', 'event', 'reel'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setDraft({ ...draft, kind: k })}
                      className={[
                        'flex-1 px-3 py-2 rounded-lg text-xs font-semibold border',
                        draft.kind === k
                          ? 'bg-brand-500 border-brand-500 text-white'
                          : 'bg-white border-ink-200 text-ink-700 hover:bg-ink-50',
                      ].join(' ')}
                    >
                      {t(`content.kind.${k}`)}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label={t('content.form.category')}>
                <select
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value as PostCategory })}
                  className="w-full px-3 py-2 rounded-lg border border-ink-200 bg-white text-sm"
                >
                  {POST_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`content.categories.${c}`)}
                    </option>
                  ))}
                </select>
              </Field>

              {draft.kind === 'reel' ? (
                <>
                  <Field label={t('content.form.title')}>
                    <input
                      value={draft.title}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm"
                    />
                  </Field>
                  <Field label={t('content.form.caption')}>
                    <textarea
                      rows={3}
                      value={draft.description}
                      onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                      placeholder={t('content.form.captionPlaceholder')}
                      className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm"
                    />
                  </Field>
                  <Field label="Visual">
                    <div className="flex flex-wrap gap-2">
                      {VISUALS.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setDraft({ ...draft, visualKind: v })}
                          className={[
                            'px-3 py-1.5 rounded-full text-[11px] font-semibold border capitalize',
                            draft.visualKind === v
                              ? 'bg-accent border-accent text-white'
                              : 'bg-white border-ink-200 text-ink-700',
                          ].join(' ')}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </Field>
                </>
              ) : (
                <>
                  <Field label={t('content.form.caption')}>
                    <textarea
                      rows={3}
                      value={draft.caption}
                      onChange={(e) => setDraft({ ...draft, caption: e.target.value })}
                      placeholder={t('content.form.captionPlaceholder')}
                      className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t('content.form.title')}>
                      <input
                        value={draft.title}
                        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm"
                      />
                    </Field>
                    <Field label={t('content.form.subtitle')}>
                      <input
                        value={draft.subtitle}
                        onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm"
                      />
                    </Field>
                    <Field label={t('content.form.emoji')}>
                      <input
                        value={draft.emoji}
                        onChange={(e) => setDraft({ ...draft, emoji: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm"
                      />
                    </Field>
                    <Field label={t('content.form.bg')}>
                      <input
                        value={draft.bg}
                        onChange={(e) => setDraft({ ...draft, bg: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm font-mono"
                      />
                    </Field>
                  </div>
                  <Field label={t('content.form.imageUrl')}>
                    <input
                      value={draft.imageUrl}
                      onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm"
                    />
                  </Field>

                  <label className="flex items-center gap-2 text-sm text-ink-700">
                    <input
                      type="checkbox"
                      checked={draft.pinned}
                      onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })}
                    />
                    {t('content.form.pinned')}
                  </label>
                </>
              )}
            </div>

            <div className="flex flex-row items-center justify-end gap-2 px-5 py-3 border-t border-ink-100">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-ink-700 hover:bg-ink-100"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={!canPublish || busy}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? t('common.loading') : t('content.form.publishCta')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
        {label}
      </span>
      {children}
    </label>
  );
}
