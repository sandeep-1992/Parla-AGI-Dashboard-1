import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconCopy,
  IconDuplicate,
  IconEdit,
  IconEye,
  IconLink,
  IconPower,
  IconSearch,
  IconTrash,
} from '../../components/Icons'
import {
  createAdminCustomer,
  deleteAdminCustomer,
  listAdminCustomers,
  pingWebhook,
  updateAdminCustomer,
} from '../../services/adminCustomerService'
import { platformAuthService } from '../../services/platformAuthService'
import { tenantPath } from '../../services/tenantService'
import type { CustomerInput, CustomerRecord } from '../../types/customer'

const EMPTY_FORM: CustomerInput = {
  slug: '',
  name: '',
  productName: 'Inquiries',
  logoUrl: '/hilton-logo.png',
  username: 'admin',
  password: '',
  webhookUrl: 'https://engine.auriforce.com/webhook/fetch-sales-enquiry',
  enabled: true,
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function portalUrl(slug: string) {
  if (typeof window === 'undefined') return tenantPath(slug || 'slug', '/login')
  return `${window.location.origin}${tenantPath(slug || 'slug', '/login')}`
}

export function AdminCustomersPage() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [durable, setDurable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CustomerInput>(EMPTY_FORM)
  const [slugManual, setSlugManual] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [pings, setPings] = useState<Record<string, number | null>>({})
  const [pingingForm, setPingingForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listAdminCustomers()
      setCustomers(data.customers)
      setDurable(data.durable)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers')
      if (String(err).includes('Unauthorized') || String(err).includes('401')) {
        platformAuthService.logout()
        navigate('/admin/login', { replace: true })
      }
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const next: Record<string, number | null> = {}
      await Promise.all(
        customers.map(async (row) => {
          try {
            const result = await pingWebhook(row.webhookUrl)
            next[row.id] = result.ms
          } catch {
            next[row.id] = null
          }
        }),
      )
      if (!cancelled) setPings(next)
    })()
    return () => {
      cancelled = true
    }
  }, [customers])

  const editing = useMemo(
    () => (editingId ? customers.find((row) => row.id === editingId) ?? null : null),
    [customers, editingId],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.slug.toLowerCase().includes(q) ||
        row.productName.toLowerCase().includes(q),
    )
  }, [customers, search])

  function startCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setSlugManual(false)
    setShowPassword(false)
    setMessage('')
  }

  function startEdit(row: CustomerRecord) {
    setEditingId(row.id)
    setSlugManual(true)
    setForm({
      slug: row.slug,
      name: row.name,
      productName: row.productName,
      logoUrl: row.logoUrl,
      username: row.username,
      password: '',
      webhookUrl: row.webhookUrl,
      enabled: row.enabled !== false,
    })
    setMessage('')
  }

  function onNameChange(name: string) {
    setForm((f) => ({
      ...f,
      name,
      slug: slugManual ? f.slug : slugify(name),
    }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      if (editingId) {
        const payload: Partial<CustomerInput> = { ...form }
        if (!payload.password) delete payload.password
        await updateAdminCustomer(editingId, payload)
        setMessage('Customer updated.')
      } else {
        if (!form.password.trim()) {
          setError('Password is required for a new customer.')
          return
        }
        await createAdminCustomer(form)
        setMessage('Customer created.')
        startCreate()
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function toggleEnabled(row: CustomerRecord) {
    try {
      await updateAdminCustomer(row.id, { enabled: !row.enabled })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update status')
    }
  }

  async function duplicateCustomer(row: CustomerRecord) {
    const base = `${row.slug}-copy`
    let slug = base
    let n = 2
    while (customers.some((c) => c.slug === slug)) {
      slug = `${base}-${n}`
      n += 1
    }
    setEditingId(null)
    setSlugManual(true)
    setForm({
      slug,
      name: `${row.name} (copy)`,
      productName: row.productName,
      logoUrl: row.logoUrl,
      username: row.username,
      password: '',
      webhookUrl: row.webhookUrl,
      enabled: true,
    })
    setMessage('Duplicated into the form — set a password and create.')
  }

  async function removeCustomer(row: CustomerRecord) {
    if (!window.confirm(`Delete ${row.name}? Their portal login will stop working.`)) return
    try {
      await deleteAdminCustomer(row.id)
      if (editingId === row.id) startCreate()
      await load()
      setMessage('Customer deleted.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete customer')
    }
  }

  async function copyLink(slug: string) {
    const url = portalUrl(slug)
    try {
      await navigator.clipboard.writeText(url)
      setMessage(`Copied link: ${url}`)
    } catch {
      setMessage(url)
    }
  }

  async function testFormPing() {
    setPingingForm(true)
    setMessage('')
    try {
      const result = await pingWebhook(form.webhookUrl)
      if (result.ok && result.ms != null) setMessage(`Webhook reachable · ${result.ms}ms`)
      else setMessage(result.error || 'Webhook ping failed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ping failed')
    } finally {
      setPingingForm(false)
    }
  }

  function logout() {
    platformAuthService.logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="admin-root">
      <header className="admin-topbar">
        <div>
          <p className="admin-eyebrow">Platform</p>
          <h1>Customers</h1>
        </div>
        <div className="admin-topbar-actions">
          <span className="admin-user">{platformAuthService.getUser()}</span>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="admin-main">
        {!durable && (
          <p className="admin-banner">
            Add Upstash / Vercel KV (`KV_REST_API_URL` + `KV_REST_API_TOKEN`) so customers survive redeploys.
          </p>
        )}
        {error && <p className="auth-error">{error}</p>}
        {message && <p className="admin-ok">{message}</p>}

        <div className="admin-grid">
          <section className="admin-panel admin-list-panel">
            <div className="admin-panel-head">
              <div>
                <h2>{loading ? 'Loading…' : `${customers.length} customer${customers.length === 1 ? '' : 's'}`}</h2>
                <p className="admin-sub">Configured hotel tenants</p>
              </div>
              <div className="admin-search">
                <IconSearch />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search customer or slug…"
                  aria-label="Search customers"
                />
              </div>
            </div>

            <div className="admin-card-list">
              {filtered.map((row) => {
                const ping = pings[row.id]
                return (
                  <article key={row.id} className={`tenant-card ${editingId === row.id ? 'on' : ''}`}>
                    <div className="tenant-card-main">
                      <div className="tenant-card-title">
                        <h3>{row.name}</h3>
                        <span className={`admin-pill ${row.enabled ? 'on' : 'off'}`}>
                          {row.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <p className="tenant-product">{row.productName}</p>
                      <div className="tenant-meta">
                        <code>/t/{row.slug}</code>
                        <span>user: {row.username}</span>
                        <span className={ping == null ? 'muted' : ''}>
                          {ping == null ? '… ping' : `${ping}ms ping`}
                        </span>
                      </div>
                      <a className="tenant-webhook" href={row.webhookUrl} target="_blank" rel="noreferrer">
                        <IconLink />
                        <span>{row.webhookUrl}</span>
                      </a>
                    </div>

                    <div className="tenant-card-actions">
                      <a className="btn btn-launch" href={tenantPath(row.slug, '/login')} target="_blank" rel="noreferrer">
                        Launch →
                      </a>
                      <button type="button" className="icon-btn" title="Edit" onClick={() => startEdit(row)}>
                        <IconEdit />
                      </button>
                      <button type="button" className="icon-btn" title="Duplicate" onClick={() => void duplicateCustomer(row)}>
                        <IconDuplicate />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        title={row.enabled ? 'Disable' : 'Enable'}
                        onClick={() => void toggleEnabled(row)}
                      >
                        <IconPower />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        title="Copy portal link"
                        onClick={() => void copyLink(row.slug)}
                      >
                        <IconCopy />
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        title="Delete"
                        onClick={() => void removeCustomer(row)}
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </article>
                )
              })}

              {!loading && filtered.length === 0 && (
                <p className="admin-empty">No customers match. Create one on the right.</p>
              )}
            </div>
          </section>

          <section className="admin-panel admin-form-panel">
            <div className="admin-panel-head stacked">
              <div>
                <h2>{editing ? 'Edit customer' : 'Create customer'}</h2>
                <p className="admin-sub">Configure hotel portal</p>
              </div>
              {editing && (
                <button type="button" className="btn btn-ghost" onClick={startCreate}>
                  New instead
                </button>
              )}
            </div>

            <form className="admin-form" onSubmit={handleSubmit}>
              <label>
                Hotel / company name
                <input value={form.name} onChange={(e) => onNameChange(e.target.value)} required />
              </label>

              <label>
                Product name
                <input
                  value={form.productName}
                  onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
                  required
                />
              </label>

              <label>
                <span className="label-row">
                  URL slug
                  {!slugManual && <em>Auto-generated</em>}
                </span>
                <input
                  value={form.slug}
                  onChange={(e) => {
                    setSlugManual(true)
                    setForm((f) => ({ ...f, slug: slugify(e.target.value) }))
                  }}
                  placeholder="hilton-t5"
                  required
                />
                <span className="admin-hint">{portalUrl(form.slug)}</span>
              </label>

              <label>
                Logo URL
                <input
                  value={form.logoUrl}
                  onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
                />
              </label>

              <label>
                <span className="label-row">
                  Enquiry webhook URL
                  <button type="button" className="text-link" onClick={() => void testFormPing()} disabled={pingingForm}>
                    {pingingForm ? 'Pinging…' : 'Test ping'}
                  </button>
                </span>
                <input
                  value={form.webhookUrl}
                  onChange={(e) => setForm((f) => ({ ...f, webhookUrl: e.target.value }))}
                  required
                />
              </label>

              <div className="admin-form-row">
                <label>
                  Login username
                  <input
                    value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Login password{editing ? ' (blank = keep)' : ''}
                  <div className="pw-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      required={!editing}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="pw-toggle"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      <IconEye />
                    </button>
                  </div>
                </label>
              </div>

              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                />
                Access enabled
              </label>

              <button type="submit" className="btn btn-create" disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save changes' : '+ Create customer'}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  )
}
