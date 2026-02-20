import { describe, it, expect } from 'vitest'
import { parseRss, extractTag } from '../../src/services/promo-monitor.service.js'

describe('RSS Parser', () => {
  describe('extractTag', () => {
    it('extrai tag normal', () => {
      expect(extractTag('<title>Meu Titulo</title>', 'title')).toBe('Meu Titulo')
    })

    it('extrai tag com CDATA', () => {
      expect(extractTag('<title><![CDATA[Titulo CDATA]]></title>', 'title')).toBe('Titulo CDATA')
    })

    it('retorna null para tag inexistente', () => {
      expect(extractTag('<title>Foo</title>', 'link')).toBeNull()
    })

    it('faz trim do conteúdo', () => {
      expect(extractTag('<title>  Espaços  </title>', 'title')).toBe('Espaços')
    })

    it('extrai tag com conteúdo multiline', () => {
      const xml = '<description><![CDATA[Linha 1\nLinha 2]]></description>'
      expect(extractTag(xml, 'description')).toBe('Linha 1\nLinha 2')
    })
  })

  describe('parseRss', () => {
    it('parse RSS com múltiplos items', () => {
      const xml = `<?xml version="1.0"?>
<rss><channel>
  <item>
    <title>Artigo 1</title>
    <link>https://example.com/1</link>
    <pubDate>Mon, 20 Feb 2026 12:00:00 GMT</pubDate>
    <description>Desc 1</description>
  </item>
  <item>
    <title>Artigo 2</title>
    <link>https://example.com/2</link>
    <pubDate>Mon, 20 Feb 2026 13:00:00 GMT</pubDate>
    <description>Desc 2</description>
  </item>
</channel></rss>`

      const items = parseRss(xml)
      expect(items).toHaveLength(2)
      expect(items[0].title).toBe('Artigo 1')
      expect(items[0].link).toBe('https://example.com/1')
      expect(items[0].description).toBe('Desc 1')
      expect(items[1].title).toBe('Artigo 2')
    })

    it('parse RSS com CDATA', () => {
      const xml = `<rss><channel>
  <item>
    <title><![CDATA[Livelo com bônus 80%]]></title>
    <link>https://example.com/promo</link>
    <pubDate>Mon, 20 Feb 2026 12:00:00 GMT</pubDate>
    <description><![CDATA[Transfira pontos <b>agora</b>]]></description>
  </item>
</channel></rss>`

      const items = parseRss(xml)
      expect(items).toHaveLength(1)
      expect(items[0].title).toBe('Livelo com bônus 80%')
      expect(items[0].description).toBe('Transfira pontos <b>agora</b>')
    })

    it('ignora items sem title', () => {
      const xml = `<rss><channel>
  <item>
    <link>https://example.com/1</link>
    <description>Sem titulo</description>
  </item>
  <item>
    <title>Com titulo</title>
    <link>https://example.com/2</link>
  </item>
</channel></rss>`

      const items = parseRss(xml)
      expect(items).toHaveLength(1)
      expect(items[0].title).toBe('Com titulo')
    })

    it('ignora items sem link', () => {
      const xml = `<rss><channel>
  <item>
    <title>Sem link</title>
    <description>Nada</description>
  </item>
</channel></rss>`

      const items = parseRss(xml)
      expect(items).toHaveLength(0)
    })

    it('usa Date() como fallback para pubDate inválida', () => {
      const xml = `<rss><channel>
  <item>
    <title>Artigo</title>
    <link>https://example.com/1</link>
  </item>
</channel></rss>`

      const items = parseRss(xml)
      expect(items).toHaveLength(1)
      expect(items[0].pubDate).toBeInstanceOf(Date)
    })

    it('retorna array vazio para XML sem items', () => {
      expect(parseRss('<rss><channel></channel></rss>')).toHaveLength(0)
    })
  })
})
