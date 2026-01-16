import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { QuoteWithDetails } from '@/app/(dashboard)/orcamentos/actions'

// Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
    borderBottom: '1 solid #e5e5e5',
    paddingBottom: 15,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 5,
  },
  companyInfo: {
    fontSize: 9,
    color: '#666666',
    lineHeight: 1.4,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  quoteNumber: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 100,
    color: '#666666',
  },
  value: {
    flex: 1,
    fontWeight: 'bold',
  },
  section: {
    marginTop: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333333',
    borderBottom: '1 solid #e5e5e5',
    paddingBottom: 4,
  },
  roomTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 10,
    color: '#555555',
  },
  table: {
    marginTop: 5,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    padding: 6,
    borderBottom: '1 solid #e5e5e5',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottom: '1 solid #eeeeee',
  },
  tableCell: {
    fontSize: 9,
  },
  descriptionCell: {
    flex: 3,
  },
  quantityCell: {
    width: 50,
    textAlign: 'center',
  },
  priceCell: {
    width: 80,
    textAlign: 'right',
  },
  totalCell: {
    width: 80,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  totalsSection: {
    marginTop: 20,
    paddingTop: 10,
    borderTop: '2 solid #333333',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  totalLabel: {
    width: 150,
    textAlign: 'right',
    paddingRight: 10,
  },
  totalValue: {
    width: 100,
    textAlign: 'right',
  },
  grandTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
  },
  grandTotalValue: {
    color: '#2563eb',
  },
  notes: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#fafafa',
    borderRadius: 4,
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  notesText: {
    fontSize: 9,
    color: '#666666',
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#999999',
    borderTop: '1 solid #e5e5e5',
    paddingTop: 10,
  },
  validityInfo: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f0f9ff',
    borderRadius: 4,
  },
  validityText: {
    fontSize: 9,
    color: '#0369a1',
  },
})

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Format date
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR').format(d)
}

interface QuotePDFProps {
  quote: QuoteWithDetails
  company?: {
    name: string
    tradeName?: string | null
    cnpj?: string | null
    phone?: string | null
    email?: string | null
    address?: string | null
  }
}

export function QuotePDF({ quote, company }: QuotePDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>
            {company?.tradeName || company?.name || 'Cortihouse Cortinas'}
          </Text>
          <Text style={styles.companyInfo}>
            {company?.cnpj && `CNPJ: ${company.cnpj}`}
            {company?.phone && ` | Tel: ${company.phone}`}
          </Text>
          {company?.address && (
            <Text style={styles.companyInfo}>{company.address}</Text>
          )}
          {company?.email && (
            <Text style={styles.companyInfo}>{company.email}</Text>
          )}
        </View>

        {/* Quote Info */}
        <View>
          <Text style={styles.title}>ORÇAMENTO</Text>
          <Text style={styles.quoteNumber}>Nº {quote.quoteNumber}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Data:</Text>
            <Text style={styles.value}>{formatDate(quote.createdAt)}</Text>
          </View>
          {quote.validUntil && (
            <View style={styles.row}>
              <Text style={styles.label}>Válido até:</Text>
              <Text style={styles.value}>{formatDate(quote.validUntil)}</Text>
            </View>
          )}
        </View>

        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CLIENTE</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nome:</Text>
            <Text style={styles.value}>{quote.customer.name}</Text>
          </View>
          {quote.customer.phone && (
            <View style={styles.row}>
              <Text style={styles.label}>Telefone:</Text>
              <Text style={styles.value}>{quote.customer.phone}</Text>
            </View>
          )}
          {quote.customer.email && (
            <View style={styles.row}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{quote.customer.email}</Text>
            </View>
          )}
          {quote.installationAddress && (
            <View style={styles.row}>
              <Text style={styles.label}>Local:</Text>
              <Text style={styles.value}>{quote.installationAddress}</Text>
            </View>
          )}
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ITENS DO ORÇAMENTO</Text>

          {quote.rooms.map((room) => (
            <View key={room.id}>
              <Text style={styles.roomTitle}>{room.name}</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCell, styles.descriptionCell]}>Descrição</Text>
                  <Text style={[styles.tableCell, styles.quantityCell]}>Qtd</Text>
                  <Text style={[styles.tableCell, styles.priceCell]}>Unit.</Text>
                  <Text style={[styles.tableCell, styles.totalCell]}>Total</Text>
                </View>
                {room.items.map((item) => (
                  <View key={item.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, styles.descriptionCell]}>
                      {item.description}
                    </Text>
                    <Text style={[styles.tableCell, styles.quantityCell]}>
                      {item.quantity}
                    </Text>
                    <Text style={[styles.tableCell, styles.priceCell]}>
                      {formatCurrency(Number(item.unitPrice))}
                    </Text>
                    <Text style={[styles.tableCell, styles.totalCell]}>
                      {formatCurrency(Number(item.total))}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(Number(quote.subtotal))}</Text>
          </View>
          {Number(quote.discountAmount) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Desconto{quote.discountType === 'percentage' ? ` (${quote.discountValue}%)` : ''}:
              </Text>
              <Text style={styles.totalValue}>
                -{formatCurrency(Number(quote.discountAmount))}
              </Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.totalLabel}>TOTAL:</Text>
            <Text style={[styles.totalValue, styles.grandTotalValue]}>
              {formatCurrency(Number(quote.total))}
            </Text>
          </View>
        </View>

        {/* Validity Info */}
        <View style={styles.validityInfo}>
          <Text style={styles.validityText}>
            {quote.validUntil && `Válido até: ${formatDate(quote.validUntil)} | `}Prazo de entrega: {quote.deliveryDays ?? 15} dias úteis
          </Text>
        </View>

        {/* Notes */}
        {quote.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Observações:</Text>
            <Text style={styles.notesText}>{quote.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Documento gerado automaticamente em {formatDate(new Date())}</Text>
        </View>
      </Page>
    </Document>
  )
}
