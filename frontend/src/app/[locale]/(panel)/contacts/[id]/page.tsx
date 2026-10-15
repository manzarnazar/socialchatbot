'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Tag, 
  Calendar, 
  MessageSquare, 
  Plus, 
  X, 
  RefreshCw,
  Edit2,
  Check,
  Activity
} from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';
import { toast } from 'sonner';
import { DropdownSelect } from '@/components/ui/dropdown-select';
import SimpleLoader from '@/components/ui/SimpleLoader';
import { useHeaderStore } from '@/store/useHeaderStore';

interface Contact {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  lifecycle_stage: string;
  tags: string[] | null;
  custom_fields: Record<string, string> | null;
  created_at: string;
}

interface ActivityLog {
  id: number;
  type: string;
  description: string;
  created_at: string;
  creator: {
    first_name: string;
    last_name: string;
  } | null;
}

export default function ContactDetailsPage() {
  const t = useTranslations('ContactsDetail');
  const tContacts = useTranslations('Contacts');
  const params = useParams();
  const contactId = params.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Edit Mode state
  const [editMode, setEditMode] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [lifecycleStage, setLifecycleStage] = useState('lead');
  const [tagsInput, setTagsInput] = useState('');

  // Note State
  const [noteContent, setNoteContent] = useState('');

  // Custom Field State
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const loadContactDetails = async () => {
    try {
      const res = await fetchWithCsrf(`/contacts/${contactId}`);
      if (res.ok) {
        const data = await res.json();
        setContact(data.contact);
        setActivities(data.activities || []);

        // Sync inputs
        if (data.contact) {
          setFirstName(data.contact.first_name || '');
          setLastName(data.contact.last_name || '');
          setEmail(data.contact.email || '');
          setPhone(data.contact.phone || '');
          setLifecycleStage(data.contact.lifecycle_stage || 'lead');
          setTagsInput((data.contact.tags || []).join(', '));
        }
      } else {
        toast.error(t('failedToRetrieveDetails'));
      }
    } catch {
      toast.error(t('networkErrorFailedToRetrieve'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contactId) {
      loadContactDetails();
    }
  }, [contactId]);

  const { setCustomHeader } = useHeaderStore();

  useEffect(() => {
    if (contact) {
      const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ');
      const displayIdentity = fullName || contact.email || contact.phone || tContacts('unnamedContact');

      setCustomHeader(
        <header className="h-16 border-b border-[#E8E8E6] px-8 flex items-center justify-between bg-white select-none shrink-0 w-full">
          <div className="flex items-center gap-3">
            <Link 
              href="/contacts"
              className="p-1 text-[#6B6B6B] hover:text-black transition-colors shrink-0 flex items-center justify-center cursor-pointer"
            >
              <ArrowLeft className="h-4.5 w-4.5 stroke-[2.5]" />
            </Link>
            <h2 className="text-sm font-bold tracking-tight text-[#6B6B6B] uppercase">
              {displayIdentity}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEditMode(prev => !prev)}
              className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer flex items-center justify-center shadow-3xs"
            >
              {editMode ? t('viewProfile') : t('editFields')}
            </button>
            {editMode && (
              <button
                type="button"
                onClick={() => {
                  const form = document.querySelector('form.contact-edit-form') as HTMLFormElement;
                  if (form) form.requestSubmit();
                }}
                disabled={isPending}
                className="bg-[#0A0A0A] text-white hover:bg-zinc-900 h-9 px-4 text-xs font-bold rounded-[6px] shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />}
                <span>{tContacts.has('save') ? tContacts('save') : 'Save'}</span>
              </button>
            )}
          </div>
        </header>
      );
    } else {
      setCustomHeader(null);
    }

    return () => {
      setCustomHeader(null);
    };
  }, [contact, editMode, isPending]);

  const handleUpdateContact = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const parsedTags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [];
        const res = await fetchWithCsrf(`/contacts/${contactId}`, {
          method: 'PUT',
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone,
            lifecycle_stage: lifecycleStage,
            tags: parsedTags,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          toast.success(t('recordUpdated'));
          setContact(data.contact);
          setEditMode(false);
          loadContactDetails(); // Refresh activity log
        } else {
          toast.error(t('failedToUpdate'));
        }
      } catch {
        toast.error(t('networkErrorDuringUpdates'));
      }
    });
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) {
      toast.error(t('noteEmptyError'));
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetchWithCsrf(`/contacts/${contactId}/notes`, {
          method: 'POST',
          body: JSON.stringify({ note: noteContent }),
        });

        if (res.ok) {
          const data = await res.json();
          toast.success(t('noteAdded'));
          setNoteContent('');
          setActivities(prev => [data.activity, ...prev]);
        } else {
          toast.error(t('failedToAddNote'));
        }
      } catch {
        toast.error(t('networkErrorAddingNote'));
      }
    });
  };

  const handleAddCustomField = () => {
    if (!newKey.trim() || !newValue.trim()) {
      toast.error(t('keyValRequired'));
      return;
    }

    startTransition(async () => {
      try {
        const updatedFields = { ...(contact?.custom_fields || {}), [newKey.trim()]: newValue.trim() };
        const res = await fetchWithCsrf(`/contacts/${contactId}`, {
          method: 'PUT',
          body: JSON.stringify({
            custom_fields: updatedFields,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setContact(data.contact);
          setNewKey('');
          setNewValue('');
          toast.success(t('propertySaved'));
        } else {
          toast.error(t('failedToSaveProperty'));
        }
      } catch {
        toast.error(t('networkError'));
      }
    });
  };

  const handleRemoveCustomField = (key: string) => {
    startTransition(async () => {
      try {
        const updatedFields = { ...(contact?.custom_fields || {}) };
        delete updatedFields[key];

        const res = await fetchWithCsrf(`/contacts/${contactId}`, {
          method: 'PUT',
          body: JSON.stringify({
            custom_fields: updatedFields,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setContact(data.contact);
          toast.success(t('propertyRemoved'));
        }
      } catch {
        toast.error(t('networkError'));
      }
    });
  };

  if (loading) {
    return <SimpleLoader message={t('syncing')} />;
  }

  if (!contact) {
    return (
      <div className="p-8 text-center text-xs font-semibold text-zinc-500">
        {t('notFound')}
      </div>
    );
  }

  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ');
  const displayIdentity = fullName || contact.email || contact.phone || tContacts('unnamedContact');

  // Initials generator
  const getInitials = () => {
    const f = contact.first_name ? contact.first_name[0] : '';
    const l = contact.last_name ? contact.last_name[0] : '';
    return (f + l).toUpperCase() || 'WF';
  };

  return (
    <div className="w-full select-none text-zinc-700 selection:bg-zinc-100 animate-fade-in flex-1 overflow-y-auto bg-white">
      
      {/* 1. TOP SECTION: Horizontal Profile Summary Banner (End-to-End Connected Divider) */}
      <div className="w-full px-8 py-6 border-b border-[#E8E8E6] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white select-none">
        <div className="flex items-center gap-4">
          {/* Large Initials Avatar */}
          <div className="w-14 h-14 rounded-full bg-zinc-50 border border-[#E8E8E6] flex items-center justify-center font-bold text-zinc-850 text-lg shadow-3xs shrink-0 select-none">
            {getInitials()}
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-zinc-950 tracking-tight">{displayIdentity}</h1>
              <span className="text-[9px] font-bold uppercase tracking-wider bg-zinc-50 border border-[#E8E8E6] text-zinc-600 px-2.5 py-0.5 rounded-full select-none flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4AE54A]" />
                {tContacts(contact.lifecycle_stage)}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-zinc-500 font-medium">
              {contact.email && <span>{contact.email}</span>}
              {contact.phone && <span>• {contact.phone}</span>}
            </div>
          </div>
        </div>

        {/* Tags Row */}
        <div className="flex flex-wrap gap-1 md:justify-end">
          {contact.tags && contact.tags.length > 0 ? (
            contact.tags.map((tag) => (
              <span key={tag} className="text-[9px] font-bold bg-[#F5F5F5] border border-[#E8E8E6] text-zinc-600 px-2.5 py-0.5 rounded-[4px]">
                {tag}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-zinc-400 font-medium italic">{t('noTags')}</span>
          )}
        </div>
      </div>

      {/* 2. BOTTOM SECTION: 2-Column Split with Continuous Vertical Divider & End-to-End Horizontal Row Dividers */}
      <div className="flex-1 flex flex-col lg:flex-row w-full min-h-0 items-stretch bg-white">
        
        {/* Left Column: Profile Details & Custom Fields (2/3 width) with border-r */}
        <div className="lg:w-2/3 border-b lg:border-b-0 lg:border-r border-[#E8E8E6] flex flex-col">
          
          {/* Profile Details Header Section */}
          <div className="px-8 py-5 border-b border-[#E8E8E6] bg-white select-none">
            <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-widest">
              {t.has('profileDetails') ? t('profileDetails') : 'Profile Details'}
            </h3>
          </div>

          {/* Profile Details Body (Edit Mode vs Read-only End-to-End Rows) */}
          {editMode ? (
            <div className="p-8 border-b border-[#E8E8E6]">
              <form onSubmit={handleUpdateContact} className="space-y-4 contact-edit-form">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{tContacts('firstName')}</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{tContacts('lastName')}</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{tContacts('email')}</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{tContacts('phone')}</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{tContacts('lifecycle')}</label>
                    <DropdownSelect
                      value={lifecycleStage}
                      onChange={(val) => setLifecycleStage(val)}
                      options={[
                        { value: 'lead', label: tContacts('lead') },
                        { value: 'subscriber', label: tContacts('subscriber') },
                        { value: 'opportunity', label: tContacts('opportunity') },
                        { value: 'customer', label: tContacts('customer') },
                        { value: 'churned', label: tContacts('churned') },
                      ]}
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">{tContacts('tagsCommaSeparated')}</label>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
                    />
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div className="divide-y divide-[#E8E8E6] border-b border-[#E8E8E6] select-none">
              <div className="px-8 py-3.5 flex items-center justify-between text-xs font-semibold">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider">{tContacts('firstName')}</span>
                <span className="text-zinc-950 font-extrabold">{contact.first_name || '—'}</span>
              </div>
              <div className="px-8 py-3.5 flex items-center justify-between text-xs font-semibold">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider">{tContacts('lastName')}</span>
                <span className="text-zinc-955 font-extrabold">{contact.last_name || '—'}</span>
              </div>
              <div className="px-8 py-3.5 flex items-center justify-between text-xs font-semibold">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider">{tContacts('email')}</span>
                <span className="text-zinc-955 font-extrabold truncate max-w-xs">{contact.email || '—'}</span>
              </div>
              <div className="px-8 py-3.5 flex items-center justify-between text-xs font-semibold">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider">{tContacts('phone')}</span>
                <span className="text-zinc-955 font-extrabold">{contact.phone || '—'}</span>
              </div>
              <div className="px-8 py-3.5 flex items-center justify-between text-xs font-semibold">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
                  {t('added', { date: '' }).replace(' {date}', '').replace('{date}', '') || 'Added'}
                </span>
                <span className="text-zinc-955 font-extrabold">{new Date(contact.created_at).toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Custom Fields Header Section */}
          <div className="px-8 py-5 border-b border-[#E8E8E6] bg-white select-none">
            <h3 className="text-xs font-bold text-zinc-955 uppercase tracking-widest">{t('customFields')}</h3>
          </div>

          {/* Custom Fields List */}
          <div className="border-b border-[#E8E8E6]">
            {contact.custom_fields && Object.keys(contact.custom_fields).length > 0 ? (
              <div className="divide-y divide-[#E8E8E6]">
                {Object.entries(contact.custom_fields).map(([key, val]) => (
                  <div key={key} className="px-8 py-3.5 flex items-center justify-between text-xs group select-none">
                    <div className="space-y-1">
                      <span className="text-[8.5px] text-zinc-400 font-bold uppercase tracking-wider block">{key}</span>
                      <span className="text-zinc-955 font-extrabold">{val}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveCustomField(key)}
                      disabled={isPending}
                      className="p-1 text-zinc-450 hover:text-red-600 rounded opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-8 py-5 text-xs text-zinc-400 font-medium italic select-none">
                {t('noCustomFields')}
              </div>
            )}
          </div>

          {/* Add Custom Field Form */}
          <div className="p-8 space-y-4 bg-white">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder={t('propertyKey')}
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
              />
              <input
                type="text"
                placeholder={t('propertyValue')}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full h-9 px-3 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs focus:outline-none focus:border-black font-medium transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={handleAddCustomField}
              disabled={isPending || !newKey.trim() || !newValue.trim()}
              className="w-full h-9 border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black text-xs font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-3xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t('saveProperty')}</span>
            </button>
          </div>

        </div>

        {/* Right Column: Activities Timeline (1/3 width) */}
        <div className="lg:w-1/3 flex flex-col bg-white">
          
          {/* Notes Writer Header Section */}
          <div className="px-8 py-5 border-b border-[#E8E8E6] bg-white select-none">
            <h4 className="text-xs font-bold text-zinc-950 uppercase tracking-widest">{t('appendNote')}</h4>
          </div>

          {/* Notes Writer Form */}
          <div className="p-8 border-b border-[#E8E8E6] space-y-3 bg-white">
            <form onSubmit={handleAddNote} className="space-y-3">
              <textarea
                placeholder={t('notePlaceholder')}
                rows={3}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F5F5F5] border border-[#E8E8E6] rounded-md text-xs font-semibold focus:outline-none focus:border-black placeholder-zinc-400 leading-relaxed resize-none transition-colors"
              />
              <button
                type="submit"
                disabled={isPending || !noteContent.trim()}
                className="flex items-center gap-1.5 h-9 px-4 bg-[#0A0A0A] hover:bg-zinc-900 text-white rounded-[6px] text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-default"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>{t('submitNote')}</span>
              </button>
            </form>
          </div>

          {/* Activity Timeline Header Section */}
          <div className="px-8 py-5 border-b border-[#E8E8E6] bg-white select-none">
            <h4 className="text-xs font-bold text-zinc-950 uppercase tracking-widest">{t('activityFeed') || 'Timeline'}</h4>
          </div>

          {/* Activity Timeline list */}
          <div className="p-8 bg-white flex-1">
            {activities.length === 0 ? (
              <p className="text-xs text-zinc-400 font-medium italic select-none">{t('noActivities')}</p>
            ) : (
              <div className="relative pl-6 border-l border-[#E8E8E6] ml-3 space-y-6">
                {activities.map((activity) => {
                  const creatorName = activity.creator ? `${activity.creator.first_name} ${activity.creator.last_name}` : 'System';

                  return (
                    <div key={activity.id} className="relative group">
                      {/* Timeline Node Icon (Centered on border line) */}
                      <span className={`absolute -left-[35px] top-0.5 h-5 w-5 rounded-full border bg-white flex items-center justify-center shadow-3xs ${
                        activity.type === 'note' 
                          ? 'border-blue-300 text-blue-600' 
                          : activity.type === 'lifecycle_change'
                            ? 'border-emerald-300 text-emerald-600'
                            : 'border-zinc-300 text-zinc-500'
                      }`}>
                        {activity.type === 'note' ? (
                          <MessageSquare className="h-2.5 w-2.5 stroke-[2.5]" />
                        ) : activity.type === 'lifecycle_change' ? (
                          <Activity className="h-2.5 w-2.5 stroke-[2.5]" />
                        ) : (
                          <Check className="h-2.5 w-2.5 stroke-[2.5]" />
                        )}
                      </span>

                      {/* Content block */}
                      <div className="space-y-1 text-left">
                        <div className="flex items-center justify-between gap-2 select-none">
                          <span className="text-[9px] font-bold text-zinc-450 uppercase tracking-wider">
                            {activity.type === 'note' ? t('noteActivity') : activity.type === 'lifecycle_change' ? t('lifecycleChange') : t('systemEvent')}
                          </span>
                          <span className="text-[9px] text-zinc-400 font-semibold">
                            {new Date(activity.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-zinc-900 leading-relaxed">
                          {activity.description}
                        </p>
                        <p className="text-[9px] text-zinc-400 font-semibold uppercase tracking-wider">
                          {t('byCreator', { name: creatorName })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
