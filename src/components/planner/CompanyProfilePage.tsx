'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

interface CompanyProfile {
  id: string;
  name: string;
  email: string;
  company_email: string | null;
  legal_name: string | null;
  vat_number: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  website: string | null;
  logo_url: string | null;
  signature_url: string | null;
}

interface Props {
  initialProfile: CompanyProfile;
}

export function CompanyProfilePage({ initialProfile }: Props) {
  const [profile, setProfile] = useState<CompanyProfile>(initialProfile);
  const [form, setForm] = useState({
    name: initialProfile.name,
    company_email: initialProfile.company_email ?? '',
    legal_name: initialProfile.legal_name ?? '',
    vat_number: initialProfile.vat_number ?? '',
    address: initialProfile.address ?? '',
    phone: initialProfile.phone ?? '',
    whatsapp: initialProfile.whatsapp ?? '',
    instagram: initialProfile.instagram ?? '',
    website: initialProfile.website ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [signatureUploading, setSignatureUploading] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch('/api/planner/company-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name || undefined,
          company_email: form.company_email || null,
          legal_name: form.legal_name || null,
          vat_number: form.vat_number || null,
          address: form.address || null,
          phone: form.phone || null,
          whatsapp: form.whatsapp || null,
          instagram: form.instagram || null,
          website: form.website || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(json.error));
      setProfile((p) => ({ ...p, ...json.data }));
      setSaveMsg('Saved successfully');
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) {
      setSaveMsg('Failed to save. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(
    file: File,
    type: 'logo' | 'signature',
    setUploading: (v: boolean) => void
  ) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/planner/company-profile/${type}`, {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Upload failed');
      if (type === 'logo') {
        setProfile((p) => ({ ...p, logo_url: json.data.logo_url }));
      } else {
        setProfile((p) => ({ ...p, signature_url: json.data.signature_url }));
      }
    } catch (err) {
      alert('Upload failed. Please try again.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveImage(type: 'logo' | 'signature') {
    try {
      const res = await fetch(`/api/planner/company-profile/${type}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Remove failed');
      if (type === 'logo') {
        setProfile((p) => ({ ...p, logo_url: null }));
      } else {
        setProfile((p) => ({ ...p, signature_url: null }));
      }
    } catch (err) {
      alert('Failed to remove image.');
      console.error(err);
    }
  }

  return (
    <div className="space-y-8">
      {/* Company Details */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Company Details</h2>
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="Your business name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Legal Name</label>
              <input
                type="text"
                value={form.legal_name}
                onChange={(e) => setForm((f) => ({ ...f, legal_name: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="Legal business name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Email</label>
              <input
                type="email"
                value={form.company_email}
                onChange={(e) => setForm((f) => ({ ...f, company_email: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="contact@yourcompany.com"
              />
              <p className="mt-1 text-xs text-gray-400">Shown on quotes and invoices instead of your login email</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VAT / Tax Number</label>
              <input
                type="text"
                value={form.vat_number}
                onChange={(e) => setForm((f) => ({ ...f, vat_number: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="VAT or tax identification number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="+1 234 567 8900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
              <input
                type="tel"
                value={form.whatsapp}
                onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="+1 234 567 8900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                <input
                  type="text"
                  value={form.instagram}
                  onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value.replace(/^@/, '') }))}
                  className="w-full rounded-lg border border-gray-200 pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                  placeholder="yourbusiness"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
              placeholder="Street, City, Postal Code, Country"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl hover:from-rose-600 hover:to-pink-700 transition-all shadow-sm disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Details'}
            </button>
            {saveMsg && (
              <span className={`text-sm ${saveMsg.startsWith('Failed') ? 'text-red-500' : 'text-green-600'}`}>
                {saveMsg}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Logo */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Company Logo</h2>
        <p className="text-sm text-gray-500 mb-5">
          Shown in the header of quotes, contracts, and invoices.
        </p>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file, 'logo', setLogoUploading);
            e.target.value = '';
          }}
        />
        <div className="flex items-start gap-6">
          {profile.logo_url ? (
            <div className="relative w-32 h-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
              <Image src={profile.logo_url} alt="Company logo" fill className="object-contain p-2" unoptimized />
            </div>
          ) : (
            <div className="w-32 h-20 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center">
              <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={logoUploading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {logoUploading ? (
                <svg className="animate-spin h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
              {logoUploading ? 'Uploading…' : profile.logo_url ? 'Replace Logo' : 'Upload Logo'}
            </button>
            {profile.logo_url && (
              <button
                type="button"
                onClick={() => handleRemoveImage('logo')}
                className="text-sm text-red-500 hover:text-red-600 text-left"
              >
                Remove logo
              </button>
            )}
            <p className="text-xs text-gray-400">JPEG, PNG or WebP · Max 5 MB</p>
          </div>
        </div>
      </div>

      {/* Signature / Stamp */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Company Signature / Stamp</h2>
        <p className="text-sm text-gray-500 mb-5">
          Placed in the planner signature section when generating or sending contracts.
          Use a transparent-background PNG for best results.
        </p>
        <input
          ref={signatureInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file, 'signature', setSignatureUploading);
            e.target.value = '';
          }}
        />
        <div className="flex items-start gap-6">
          {profile.signature_url ? (
            <div className="relative w-48 h-24 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
              <Image src={profile.signature_url} alt="Company signature" fill className="object-contain p-2" unoptimized />
            </div>
          ) : (
            <div className="w-48 h-24 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center">
              <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => signatureInputRef.current?.click()}
              disabled={signatureUploading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {signatureUploading ? (
                <svg className="animate-spin h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
              {signatureUploading ? 'Uploading…' : profile.signature_url ? 'Replace Signature' : 'Upload Signature / Stamp'}
            </button>
            {profile.signature_url && (
              <button
                type="button"
                onClick={() => handleRemoveImage('signature')}
                className="text-sm text-red-500 hover:text-red-600 text-left"
              >
                Remove signature
              </button>
            )}
            <p className="text-xs text-gray-400">JPEG, PNG or WebP · Transparent PNG recommended</p>
          </div>
        </div>
      </div>
    </div>
  );
}
