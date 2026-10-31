import { Link } from '@tanstack/react-router'
import { NewsletterForm } from './newsletter-form'
import { ApiStatus } from './api-status'

const benefits = [
  {
    mark: 'W',
    title: 'Segurança da carteira',
    text: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    mark: 'C',
    title: 'Criadores em destaque',
    text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    mark: 'D',
    title: 'Alertas de lançamentos',
    text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
] as const
const groups = [
  {
    title: 'Meu perfil',
    links: [
      'Meu perfil',
      'Minha coleção',
      'Atividade',
      'Estúdio do criador',
      'Lista de interesse',
    ],
  },
  {
    title: 'Central de ajuda',
    links: [
      'Central de ajuda',
      'Como comprar NFTs',
      'Carteira e segurança',
      'Política do mercado',
      'Denunciar item',
    ],
  },
  {
    title: 'Coleções',
    links: ['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Utilidade'],
  },
] as const
const socials = [
  'facebook',
  'twitter',
  'google',
  'linkedin',
  'instagram',
] as const

export function DesktopFooter() {
  return (
    <footer className="desktop-footer page-container">
      <div className="footer-benefits">
        {benefits.map((benefit) => (
          <section key={benefit.mark} className="footer-benefit">
            <span className="benefit-medallion" aria-hidden="true">
              {benefit.mark}
            </span>
            <h2>{benefit.title}</h2>
            <p>{benefit.text}</p>
          </section>
        ))}
        <NewsletterForm />
      </div>
      <div className="footer-brand">
        <Link to="/" aria-label="Kurio, voltar ao início" className="wordmark">
          KURIO
        </Link>
        <p>
          Feito para colecionadores,
          <br />
          criadores e cultura
        </p>
        <a href="mailto:contato@email.com">contato@email.com</a>
        <a href="tel:+551140028922">+55 11 4002 8922</a>
      </div>
      <div className="footer-links">
        {groups.map((group) => (
          <section key={group.title}>
            <h2>{group.title}</h2>
            <ul>
              {group.links.map((label) => (
                <li key={label}>
                  {label === 'Meu perfil' ? (
                    <Link to="/profile">{label}</Link>
                  ) : (
                    <button
                      type="button"
                      aria-disabled="true"
                      title={`${label}: em breve`}
                    >
                      {label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
        <div className="footer-social">
          <section>
            <h2>Redes sociais</h2>
            <div className="social-links">
              {socials.map((social) => (
                <button
                  type="button"
                  key={social}
                  aria-label={`${social} (em breve)`}
                  aria-disabled="true"
                  title="Link em breve"
                >
                  <img
                    src={`/assets/icons/social-${social}.svg`}
                    alt=""
                    width="30"
                    height="30"
                  />
                </button>
              ))}
            </div>
          </section>
          <section>
            <h2>Carteiras compatíveis</h2>
            <p className="wallet-chip">METAMASK • WALLETCONNECT • COINBASE</p>
          </section>
        </div>
      </div>
      <p className="footer-copyright">
        © 2026 Kurio. Propriedade digital para todos.
      </p>
      <div className="api-status">
        <ApiStatus />
      </div>
    </footer>
  )
}
