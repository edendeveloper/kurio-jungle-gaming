import { useId } from 'react'
import { PrimaryButton } from '@/components/ui/button'

export function NewsletterForm() {
  const id = useId()
  return (
    <form
      className="newsletter"
      aria-labelledby={`${id}-title`}
      onSubmit={(event) => event.preventDefault()}
    >
      <h2 id={`${id}-title`}>Antecipe-se ao próximo lançamento</h2>
      <div className="newsletter-input">
        <label htmlFor={id} className="sr-only">
          Seu e-mail
        </label>
        <input
          id={id}
          type="email"
          placeholder="digite seu e-mail..."
          readOnly
          aria-describedby={`${id}-note`}
        />
        <PrimaryButton
          type="submit"
          aria-disabled="true"
          title="Inscrições em breve"
        >
          Enviar
        </PrimaryButton>
      </div>
      <p>
        Receba lançamentos selecionados, histórias de criadores e novidades do
        mercado.
      </p>
      <small id={`${id}-note`}>Inscrições em breve.</small>
    </form>
  )
}
