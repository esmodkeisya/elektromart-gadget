"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Camera, Lock, Mail, Phone, Save, Trash2, User } from "lucide-react";
import AdminAvatar from "../components/AdminAvatar";
import TopBar from "../components/TopBar";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

type Profile = { full_name: string; phone: string; job_title: string; avatar_url: string | null };
const emptyProfile: Profile = { full_name: "", phone: "", job_title: "Administrator", avatar_url: null };

export default function AdminProfil() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        setError(t("admin.sessionNotFoundLogin"));
        setLoading(false);
        return;
      }

      setEmail(userData.user.email ?? "");
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, phone, job_title, avatar_url")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (profileError) setError(profileError.message);
      if (data) setProfile({ ...emptyProfile, ...data });
      setLoading(false);
    }

    void loadProfile();
  }, []);

  function updateField(field: keyof Profile, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setError(t("admin.sessionNotFound"));
      setSaving(false);
      return;
    }

    const { error: saveError } = await supabase.from("profiles").upsert({
      id: userData.user.id,
      full_name: profile.full_name.trim(),
      phone: profile.phone.trim(),
      job_title: profile.job_title.trim(),
      avatar_url: profile.avatar_url,
      updated_at: new Date().toISOString(),
    });
    const { error: emailError } = email.trim()
      ? await supabase.auth.updateUser({ email: email.trim() })
      : { error: null };
    setSaving(false);
    if (saveError || emailError) setError((saveError ?? emailError)?.message ?? t("admin.profileSaveFailed"));
    else setMessage(t("admin.profileSaved"));
  }

  async function changePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      setError(t("admin.photoInvalid"));
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    setUploading(true);
    setError("");
    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${userData.user.id}/avatar-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });
    if (uploadError) {
      setError(uploadError.message === "Bucket not found"
        ? t("admin.storageNotConfigured")
        : uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: saveError } = await supabase.from("profiles").upsert({ id: userData.user.id, avatar_url: data.publicUrl });
    setUploading(false);
    if (saveError) setError(saveError.message);
    else {
      setProfile((current) => ({ ...current, avatar_url: data.publicUrl }));
      setMessage(t("admin.photoUpdated"));
    }
    event.target.value = "";
  }

  async function removePhoto() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    setUploading(true);
    const { error: removeError } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userData.user.id);
    setUploading(false);
    if (removeError) setError(removeError.message);
    else {
      setProfile((current) => ({ ...current, avatar_url: null }));
      setMessage(t("admin.photoDeleted"));
    }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 6) {
      setError(t("admin.passwordTooShort"));
      return;
    }
    const { error: passwordError } = await supabase.auth.updateUser({ password });
    if (passwordError) setError(passwordError.message);
    else {
      setPassword("");
      setMessage(t("admin.passwordChanged"));
    }
  }

  return (
    <div className="min-h-full bg-admin-canvas">
      <TopBar placeholder={t("admin.searchTransactions")} />
      <div className="px-8 pb-10 pt-7">
        <h1 className="text-[28px] font-bold tracking-tight text-admin-ink">{t("admin.adminProfile")}</h1>
        <p className="mt-1 text-sm text-admin-muted">{t("admin.profileSubtitle")}</p>
        {message ? <p className="mt-4 rounded-lg bg-[#E9F8EF] px-4 py-3 text-sm text-[#15803D]">{message}</p> : null}
        {error ? <p className="mt-4 rounded-lg bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">{error}</p> : null}

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-card">
          {loading ? <p className="text-sm text-admin-muted">{t("admin.loadingProfile")}</p> : (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
              <div className="flex flex-col items-center text-center">
                <AdminAvatar src={profile.avatar_url} className="h-28 w-28" />
                <p className="mt-4 text-lg font-bold text-admin-ink">{profile.full_name || "Admin"}</p>
                <span className="mt-2 rounded-full bg-[#EEE7FA] px-3 py-1 text-xs font-semibold text-[#6D28D9]">{profile.job_title || "Administrator"}</span>
                <label className="mt-4 flex cursor-pointer items-center gap-2 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-2 text-sm font-semibold text-[#2563EB]">
                  <Camera size={15} /> {uploading ? t("auth.processing") : t("admin.changePhoto")}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={changePhoto} disabled={uploading} className="sr-only" />
                </label>
                {profile.avatar_url ? <button type="button" onClick={removePhoto} disabled={uploading} className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#DC2626]"><Trash2 size={13} /> {t("admin.deletePhoto")}</button> : null}
              </div>

              <form onSubmit={saveProfile}>
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-admin-ink">{t("admin.basicInfo")}</h2>
                  <button type="submit" disabled={saving} className="flex items-center gap-1.5 text-sm font-semibold text-admin-accent"><Save size={14} /> {saving ? t("auth.saving") : t("admin.saveProfile")}</button>
                </div>
                <label className="mb-1.5 block text-sm font-semibold text-admin-ink">{t("auth.fullName")}</label>
                <div className="mb-4 flex h-11 items-center gap-3 rounded-lg border border-[#E4E8F1] px-3"><User size={16} className="text-admin-muted" /><input value={profile.full_name} onChange={(event) => updateField("full_name", event.target.value)} className="w-full text-sm text-admin-ink outline-none" /></div>
                <label className="mb-1.5 block text-sm font-semibold text-admin-ink">{t("admin.emailAddress")}</label>
                <div className="mb-4 flex h-11 items-center gap-3 rounded-lg border border-[#E4E8F1] px-3"><Mail size={16} className="text-admin-muted" /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full text-sm text-admin-ink outline-none" /></div>
                <label className="mb-1.5 block text-sm font-semibold text-admin-ink">{t("auth.phone")}</label>
                <div className="flex h-11 items-center gap-3 rounded-lg border border-[#E4E8F1] px-3"><Phone size={16} className="text-admin-muted" /><input value={profile.phone} onChange={(event) => updateField("phone", event.target.value)} className="w-full text-sm text-admin-ink outline-none" /></div>
              </form>
            </div>
          )}
        </div>

        <form onSubmit={updatePassword} className="mt-5 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-card md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8F0FE] text-[#2563EB]"><Lock size={20} /></span><div><p className="font-bold text-admin-ink">{t("admin.passwordSecurity")}</p><p className="text-sm text-admin-muted">{t("admin.passwordSecuritySubtitle")}</p></div></div>
          <div className="flex gap-2"><input type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t("auth.newPassword")} className="h-11 rounded-lg border border-[#E4E8F1] px-3 text-sm outline-none" /><button type="submit" className="rounded-xl bg-admin-navy px-4 py-2.5 text-sm font-semibold text-white">{t("admin.changePassword")}</button></div>
        </form>
      </div>
    </div>
  );
}