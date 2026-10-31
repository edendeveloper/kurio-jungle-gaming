import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
export function AccountField({
  id,
  label,
  value,
  onChange,
  error,
  type = 'text',
  autoComplete,
  hideLabel = false,
  optional = false,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  type?: 'text' | 'email' | 'password'
  autoComplete?: string
  hideLabel?: boolean
  optional?: boolean
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="account-field">
      <label htmlFor={id} className={hideLabel ? 'sr-only' : undefined}>
        {label}
        {optional && ' (opcional)'}
      </label>
      <div className="account-input-wrap">
        <input
          id={id}
          type={type === 'password' && visible ? 'text' : type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={hideLabel ? label : undefined}
          autoComplete={autoComplete}
          aria-required={!optional}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          maxLength={type === 'password' ? 128 : 254}
        />
        {type === 'password' && (
          <button
            type="button"
            className="password-toggle"
            aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`}
            aria-pressed={visible}
            onClick={() => setVisible((previous) => !previous)}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && (
        <p className="account-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
