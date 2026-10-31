import { Catalog, CatalogSearchBar } from './components/catalog'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

import { PrimaryButton } from '@/components/ui/button'

import { SectionHeading } from '@/components/ui/section-heading'

import { articles, artwork, promotions } from './data/home'
import { useEffect } from 'react'
import { setPageMetadata } from '@/lib/seo'
import { nftImageSrcSet } from '@/lib/nft-image'

function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="hero-eyebrow">Bem-vindo à Kurio</p>
        <h2 id="hero-title">
          <span className="hero-desktop-title">
            SEJA DONO DO FUTURO
            <br />
            DA ARTE DIGITAL
          </span>
          <span className="hero-mobile-title">
            SEJA DONO DA
            <br />
            CULTURA DIGITAL
          </span>
        </h2>
        <p className="hero-description hero-desktop-description">
          Descubra NFTs selecionados de criadores emergentes e consagrados.
          Colecione arte digital rara, apoie artistas e tenha uma parte da
          cultura da internet.
        </p>
        <p className="hero-description hero-mobile-description">
          Descubra NFTs selecionados de criadores do mundo todo.
        </p>
        <PrimaryButton asChild className="hero-explore">
          <a href="#catalogo">
            EXPLORAR{' '}
            <ArrowRight
              aria-hidden="true"
              className="mobile-explore-arrow"
              size={16}
            />
          </a>
        </PrimaryButton>
      </div>
      <div className="hero-art">
        <img
          className="hero-main-art"
          src={artwork.emerald}
          srcSet={nftImageSrcSet(artwork.emerald)}
          sizes="(max-width: 767px) 138px, 450px"
          alt="Emerald Ape, arte digital de um símio de óculos e jaqueta verde"
          width="1024"
          height="1024"
          fetchPriority="high"
        />
        <img
          className="hero-small-art"
          src={artwork.sage}
          srcSet={nftImageSrcSet(artwork.sage)}
          sizes="58px"
          alt=""
          width="1024"
          height="1024"
        />
      </div>
      <picture className="hero-dots">
        <source
          media="(max-width: 767px)"
          srcSet="/assets/decorations/hero-dots-mobile.svg"
        />
        <img
          src="/assets/decorations/hero-dots-desktop.svg"
          alt="Slide 1 de 3; carrossel em breve"
        />
      </picture>
    </section>
  )
}
export function HomePage() {
  useEffect(() => {
    setPageMetadata(
      'Kurio — Marketplace de NFTs',
      'Descubra NFTs, colecione arte digital e conheça novos criadores na Kurio.',
    )
  }, [])
  return (
    <div className="home-page">
      <h1 className="sr-only">Início</h1>
      <CatalogSearchBar mobile />
      <Hero />
      <Catalog />
      <section className="promotions" aria-label="Destaques e lançamentos">
        {promotions.map((promo) => (
          <article className="promotion" key={promo.title}>
            <img
              className="promotion-art"
              src={promo.image}
              srcSet={nftImageSrcSet(promo.image)}
              sizes="(max-width: 767px) 100vw, 250px"
              alt=""
              loading="lazy"
              width="1024"
              height="1024"
            />
            <div>
              <h2>{promo.title}</h2>
              <p>{promo.description}</p>
              <PrimaryButton asChild>
                <Link to="/marketplace">
                  Explorar <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </PrimaryButton>
            </div>
          </article>
        ))}
      </section>
      <section className="editorial" aria-label="Diário da Cunhagem">
        <SectionHeading description="Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.">
          Diário da Cunhagem
        </SectionHeading>
        <div className="editorial-grid">
          {articles.map((article) => (
            <article key={article.title} className="editorial-card">
              <img
                src={article.image}
                srcSet={nftImageSrcSet(article.image)}
                sizes="(max-width: 767px) 100vw, 280px"
                alt=""
                loading="lazy"
                width="1024"
                height="1024"
              />
              <div>
                <p className="article-meta">
                  {article.date} | Leitura de {article.minutes} min
                </p>
                <h3>{article.title}</h3>
                <p>{article.description}</p>
                <button
                  type="button"
                  aria-disabled="true"
                  title="Conteúdo editorial em breve"
                  aria-label={`Ler mais: ${article.title} (em breve)`}
                >
                  Ler mais <span aria-hidden="true">→</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
