import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { ProfileField, updateUserProfile } from '../../lib/db';

interface ClientProfileTabProps {
  user: any;
  userProfile: any;
  editName: string;
  onEditNameChange: (val: string) => void;
  profileFields: ProfileField[];
  profileValues: Record<string, string>;
  onProfileFieldChange: (fieldId: string, val: string) => void;
  onSave: (e: React.FormEvent) => void;
  savingProfile: boolean;
  profileError: string | null;
  profileSuccess: boolean;
  lang: 'en' | 'hi';
  t: (key: string) => string;
  onRefreshProfile?: () => Promise<void>;
}

export default function ClientProfileTab({
  user,
  userProfile,
  editName,
  onEditNameChange,
  profileFields,
  profileValues,
  onProfileFieldChange,
  onSave,
  savingProfile,
  profileError,
  profileSuccess,
  lang,
  t,
  onRefreshProfile
}: ClientProfileTabProps) {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestNewName, setRequestNewName] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const handleSubmitRequest = async () => {
    if (!requestNewName.trim() || !userProfile?.uid) return;
    setSubmittingRequest(true);
    try {
      await updateUserProfile(userProfile.uid, {
        requestedFirmName: requestNewName.trim()
      });
      setShowRequestForm(false);
      setRequestNewName('');
      if (onRefreshProfile) {
        await onRefreshProfile();
      }
    } catch (err) {
      console.error('Failed to submit firm name request:', err);
      alert(lang === 'en' ? 'Failed to submit change request.' : 'अनुरोध सबमिट करने में विफल।');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!userProfile?.uid) return;
    setSubmittingRequest(true);
    try {
      await updateUserProfile(userProfile.uid, {
        requestedFirmName: ''
      });
      if (onRefreshProfile) {
        await onRefreshProfile();
      }
    } catch (err) {
      console.error('Failed to cancel firm name request:', err);
      alert(lang === 'en' ? 'Failed to cancel change request.' : 'अनुरोध रद्द करने में विफल।');
    } finally {
      setSubmittingRequest(false);
    }
  };
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-[2rem] p-6 sm:p-8 shadow-md max-w-xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-none">
          {t('profileTitle')}
        </h2>
        <p className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-zinc-500 pt-1">
          {lang === 'en' ? 'Manage and update your business profile details.' : 'अपने व्यवसाय प्रोफ़ाइल विवरण प्रबंधित और अद्यतन करें।'}
        </p>
      </div>

      {profileError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400 p-3.5 rounded-2xl flex items-center gap-3 text-xs font-bold">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{profileError}</span>
        </div>
      )}

      {profileSuccess && (
        <div className="bg-emerald-50 border border-emerald-250 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/55 dark:text-emerald-400 p-3.5 rounded-2xl flex items-center gap-3 text-xs font-bold">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{t('profileSavedSuccess')}</span>
        </div>
      )}

      <form onSubmit={onSave} className="space-y-4">
        {/* Email (Disabled) */}
        <div className="space-y-1.5 text-left">
          <label className="block text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
            {t('emailLabel')}
          </label>
          <input
            type="email"
            disabled
            value={user?.email || ''}
            className="w-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-850 rounded-2xl px-4 py-3 text-slate-400 dark:text-zinc-555 font-semibold text-xs outline-none cursor-not-allowed"
          />
        </div>

        {/* Full Name */}
        <div className="space-y-1.5 text-left">
          <label className="block text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
            {t('nameLabel')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            className="w-full bg-slate-50/50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-2xl px-4 py-3 text-slate-800 dark:text-slate-100 font-semibold text-xs outline-none transition-all duration-200"
          />
        </div>

        {/* Dynamic Fields */}
        {profileFields.map((field) => {
          const label = lang === 'en' ? field.labelEn : field.labelHi;
          const value = profileValues[field.id || ''] || '';

          const isFirmNameField = field.labelEn.toLowerCase() === 'firm name';
          const isLocked = isFirmNameField && userProfile?.registrationCompleted && userProfile?.customDetails?.[field.id || ''];

          return (
            <div key={field.id} className="space-y-1.5 text-left">
              <label className="block text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                {label} {field.required && !isLocked && <span className="text-red-500">*</span>}
              </label>

              {isLocked ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    disabled
                    value={value}
                    className="w-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-850 rounded-2xl px-4 py-3 text-slate-400 dark:text-zinc-555 font-semibold text-xs outline-none cursor-not-allowed"
                  />

                  {userProfile.requestedFirmName ? (
                    <div className="bg-amber-50/50 dark:bg-amber-955/10 border border-amber-200/50 dark:border-amber-900/35 rounded-2xl p-3 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                      <div className="text-left">
                        <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                          {lang === 'en' ? 'Change Request Pending' : 'परिवर्तन अनुरोध लंबित'}
                        </p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-355 mt-0.5">
                          {lang === 'en' ? 'Requested: ' : 'अनुरोधित: '} <strong>"{userProfile.requestedFirmName}"</strong>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCancelRequest}
                        disabled={submittingRequest}
                        className="px-3 py-1.5 bg-slate-150 hover:bg-slate-250 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-250 font-extrabold text-[10px] rounded-lg transition-all active:scale-95 border border-slate-200 dark:border-zinc-700 cursor-pointer disabled:opacity-50"
                      >
                        {lang === 'en' ? 'Cancel Request' : 'अनुरोध रद्द करें'}
                      </button>
                    </div>
                  ) : showRequestForm ? (
                    <div className="border border-slate-150 dark:border-zinc-800 rounded-2xl p-3.5 bg-slate-50/30 dark:bg-zinc-950/10 space-y-3 animate-in slide-in-from-top-2 duration-200">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase">
                          {lang === 'en' ? 'New Firm Name' : 'नया फर्म का नाम'}
                        </label>
                        <input
                          type="text"
                          required
                          value={requestNewName}
                          onChange={(e) => setRequestNewName(e.target.value)}
                          placeholder={lang === 'en' ? 'Enter new firm name...' : 'नया फर्म नाम दर्ज करें...'}
                          className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 font-semibold text-xs outline-none transition-all duration-200"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={submittingRequest}
                          onClick={handleSubmitRequest}
                          className="flex-grow py-1.5 bg-[#5d51e8] hover:bg-[#4b3fd3] text-white font-extrabold text-[10px] rounded-lg transition-all active:scale-95 text-center cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          {submittingRequest ? 'Submitting...' : (lang === 'en' ? 'Submit Request' : 'अनुरोध सबमिट करें')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowRequestForm(false);
                            setRequestNewName('');
                          }}
                          className="py-1.5 px-3 bg-slate-100 hover:bg-slate-250 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 font-extrabold text-[10px] rounded-lg border border-slate-200 dark:border-zinc-700 transition-all active:scale-95 cursor-pointer"
                        >
                          {lang === 'en' ? 'Cancel' : 'रद्द करें'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-left pt-0.5">
                      <button
                        type="button"
                        onClick={() => setShowRequestForm(true)}
                        className="text-[#5d51e8] hover:text-[#4b3fd3] font-black text-xs cursor-pointer flex items-center gap-1 active:scale-95 transition-all"
                      >
                        {lang === 'en' ? 'Request Firm Name Change' : 'फर्म का नाम बदलने का अनुरोध करें'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type={field.type}
                  required={field.required}
                  value={value}
                  onChange={(e) => onProfileFieldChange(field.id || '', e.target.value)}
                  placeholder={label}
                  className="w-full bg-slate-50/50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-2xl px-4 py-3 text-slate-800 dark:text-slate-100 font-semibold text-xs outline-none transition-all duration-200"
                />
              )}
            </div>
          );
        })}

        <button
          type="submit"
          disabled={savingProfile}
          className="w-full bg-[#5d51e8] hover:bg-[#4b3fd3] text-white font-extrabold text-sm py-3.5 px-6 rounded-full shadow-md shadow-[#5d51e8]/20 transition-all active:scale-95 text-center mt-6 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {savingProfile && (
            <Loader2 className="animate-spin h-4 w-4 text-white" />
          )}
          <span>{t('saveProfileBtn')}</span>
        </button>
      </form>
    </div>
  );
}
