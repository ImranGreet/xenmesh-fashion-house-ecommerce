import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import axios from 'axios'
import { http } from '../api/http'

export type StoreSettings = {
  storeName: string
  contactEmail: string
  phone: string
  location: string
}

const emptySettings: StoreSettings = {
  storeName: '',
  contactEmail: '',
  phone: '',
  location: '',
}

export function StoreSettingsForm({
  administratorEmail,
  onSaved,
}: {
  administratorEmail: string
  onSaved: (settings: StoreSettings) => void
}) {
  const [settings, setSettings] = useState<StoreSettings>(emptySettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    http.get<StoreSettings>('/store/settings', { signal: controller.signal })
      .then(({ data }) => setSettings(data))
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return
        const message = axios.isAxiosError<{ message?: string | string[] }>(requestError)
          ? requestError.response?.data.message
          : undefined
        setError(Array.isArray(message) ? message.join(', ') : typeof message === 'string' ? message : 'Unable to load store settings.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const { data } = await http.patch<StoreSettings>('/admin/settings', settings)
      setSettings(data)
      onSaved(data)
      setNotice('Your store details have been saved.')
    } catch (requestError: unknown) {
      const message = axios.isAxiosError<{ message?: string | string[] }>(requestError)
        ? requestError.response?.data.message
        : undefined
      setError(Array.isArray(message) ? message.join(', ') : typeof message === 'string' ? message : 'Unable to save store settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="panel settings-card store-settings-form" onSubmit={saveSettings}>
      <span className="eyebrow">YOUR STORE</span>
      <h2>House details</h2>
      <p>Update the public name and contact information shown to your customers.</p>
      {loading ? <div className="settings-loading" role="status">Loading saved store details…</div> : (
        <>
          <label>Store name<input value={settings.storeName} maxLength={160} required onChange={(event) => setSettings({ ...settings, storeName: event.target.value })} /></label>
          <label>Contact email<input type="email" value={settings.contactEmail} maxLength={254} required onChange={(event) => setSettings({ ...settings, contactEmail: event.target.value })} /></label>
          <label>Phone number<input type="tel" value={settings.phone} maxLength={32} required onChange={(event) => setSettings({ ...settings, phone: event.target.value })} /></label>
          <label>Store location<input value={settings.location} maxLength={160} required onChange={(event) => setSettings({ ...settings, location: event.target.value })} /></label>
          <div className="settings-admin-account"><span>Administrator account</span><strong>{administratorEmail}</strong><small>This is the account currently signed in. Change accounts by signing out.</small></div>
          {error && <p className="settings-form-error" role="alert">{error}</p>}
          {notice && <p className="settings-form-success" role="status">{notice}</p>}
          <button className="button button-dark settings-save-button" disabled={saving}>{saving ? 'Saving…' : 'Save house details'}</button>
        </>
      )}
    </form>
  )
}
