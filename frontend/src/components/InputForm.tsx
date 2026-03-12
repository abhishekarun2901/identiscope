import { useState, useRef } from 'react'
import type { KeyboardEvent } from 'react'

interface TagInputProps {
  label: string
  placeholder: string
  tags: string[]
  type: 'username' | 'email' | 'phone'
  onAdd: (value: string) => void
  onRemove: (index: number) => void
  disabled?: boolean
  validate?: (value: string) => string | null
}

function TagInput({ label, placeholder, tags, type, onAdd, onRemove, disabled, validate }: TagInputProps) {
  const [value, setValue] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const tryAdd = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    if (validate) {
      const err = validate(trimmed)
      if (err) { setValidationError(err); return }
    }
    setValidationError(null)
    onAdd(trimmed)
    setValue('')
  }

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      tryAdd()
    }
    if (e.key === 'Backspace' && value === '' && tags.length > 0) {
      onRemove(tags.length - 1)
    }
  }

  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </label>
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '0.5rem 0.75rem', minHeight: 48, cursor: 'text',
          transition: 'border-color 0.2s',
        }}
        onFocus={() => {}}
      >
        {tags.map((tag, i) => (
          <span key={i} className={`tag ${type === 'email' ? 'email' : type === 'phone' ? 'phone' : ''}`}>
            {tag}
            <button className="tag-remove" onClick={(e) => { e.stopPropagation(); onRemove(i) }} disabled={disabled} aria-label={`Remove ${tag}`}>×</button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={value}
          onChange={e => { setValue(e.target.value); setValidationError(null) }}
          onKeyDown={handleKey}
          onBlur={tryAdd}
          placeholder={tags.length === 0 ? placeholder : ''}
          disabled={disabled}
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--text-primary)', fontSize: '0.875rem',
            fontFamily: 'Inter, sans-serif', flex: 1, minWidth: 120,
          }}
          aria-label={label}
        />
      </div>
      {validationError && (
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--status-not-found)' }}>
          ⚠ {validationError}
        </p>
      )}
      <p style={{ margin: '0.25rem 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
        Press Enter or comma to add multiple
      </p>
    </div>
  )
}

// Validators
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phoneRe = /^\+?[1-9]\d{6,14}$/
const usernameRe = /^[a-zA-Z0-9._\-]+$/

function validateEmail(v: string) {
  return emailRe.test(v) ? null : 'Invalid email address'
}
function validatePhone(v: string) {
  const normalized = v.replace(/[\s\-()]/g, '')
  return phoneRe.test(normalized) ? null : 'Invalid phone (use E.164 format like +1234567890)'
}
function validateUsername(v: string) {
  if (v.length > 50) return 'Username too long (max 50 chars)'
  return usernameRe.test(v) ? null : 'Username may only contain letters, numbers, ., -, _'
}

interface InputFormProps {
  usernames: string[]
  emails: string[]
  phones: string[]
  onChangeUsernames: (v: string[]) => void
  onChangeEmails: (v: string[]) => void
  onChangePhones: (v: string[]) => void
  disabled?: boolean
}

export default function InputForm({ usernames, emails, phones, onChangeUsernames, onChangeEmails, onChangePhones, disabled }: InputFormProps) {
  const addTo = (arr: string[], val: string, set: (v: string[]) => void) => {
    if (!arr.includes(val)) set([...arr, val])
  }
  const removeFrom = (arr: string[], idx: number, set: (v: string[]) => void) => {
    set(arr.filter((_, i) => i !== idx))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <TagInput
        label="👤 Usernames"
        placeholder="torvalds, alice, bob..."
        tags={usernames}
        type="username"
        validate={validateUsername}
        onAdd={v => addTo(usernames, v, onChangeUsernames)}
        onRemove={i => removeFrom(usernames, i, onChangeUsernames)}
        disabled={disabled}
      />
      <TagInput
        label="✉️ Email Addresses"
        placeholder="alice@example.com..."
        tags={emails}
        type="email"
        validate={validateEmail}
        onAdd={v => addTo(emails, v, onChangeEmails)}
        onRemove={i => removeFrom(emails, i, onChangeEmails)}
        disabled={disabled}
      />
      <TagInput
        label="📱 Phone Numbers"
        placeholder="+1234567890..."
        tags={phones}
        type="phone"
        validate={validatePhone}
        onAdd={v => addTo(phones, v, onChangePhones)}
        onRemove={i => removeFrom(phones, i, onChangePhones)}
        disabled={disabled}
      />
    </div>
  )
}
