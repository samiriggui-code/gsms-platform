import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { FinanceItem, Prestation } from "@/lib/api";

type Labels = {
  docQuote: string;
  docInvoice: string;
  issuedOn: string;
  validUntil: string;
  mission: string;
  sectionContext: string;
  sectionFindings: string;
  sectionLines: string;
  sectionDeliverables: string;
  sectionConditions: string;
  sectionSignature: string;
  totalTtc: string;
  signedBadge: string;
  signClient: string;
  signGsms: string;
};

type Props = {
  item: FinanceItem;
  prestation: Prestation | null;
  money: (n: number) => string;
  locale: string;
  labels: Labels;
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#111721",
    paddingTop: 0,
    paddingBottom: 36,
  },
  hero: {
    backgroundColor: "#111721",
    color: "#ffffff",
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 36,
  },
  brand: {
    fontSize: 8,
    letterSpacing: 2.4,
    color: "#ffffff88",
    textTransform: "uppercase",
  },
  title: {
    marginTop: 10,
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
  },
  ref: {
    marginTop: 6,
    fontSize: 9,
    color: "#ffffff99",
  },
  metaRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
  },
  mission: {
    marginTop: 6,
    fontSize: 9,
    color: "#ffffff99",
  },
  body: {
    paddingHorizontal: 36,
    paddingTop: 22,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 8,
    letterSpacing: 1.4,
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 8,
    fontFamily: "Helvetica-Bold",
  },
  para: {
    fontSize: 10,
    lineHeight: 1.45,
    color: "#334155",
  },
  box: {
    marginTop: 8,
    padding: 10,
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
  },
  finding: {
    marginBottom: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
  },
  findingTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginBottom: 4,
  },
  source: {
    marginTop: 6,
    fontSize: 8,
    color: "#94a3b8",
  },
  lineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  lineLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    maxWidth: "70%",
  },
  lineDetail: {
    marginTop: 3,
    fontSize: 8,
    color: "#64748b",
    maxWidth: "70%",
  },
  amount: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
  },
  totalRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 8,
    letterSpacing: 1.2,
    color: "#64748b",
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
  },
  totalValue: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
  },
  twoCol: {
    flexDirection: "row",
    gap: 18,
  },
  col: {
    flex: 1,
  },
  bullet: {
    marginBottom: 4,
    fontSize: 9,
    color: "#475569",
    lineHeight: 1.4,
  },
  signRow: {
    marginTop: 8,
    flexDirection: "row",
    gap: 16,
  },
  signBox: {
    flex: 1,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#cbd5e1",
    paddingVertical: 22,
    alignItems: "center",
  },
  signed: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#ecfdf5",
    color: "#065f46",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  payNote: {
    marginTop: 8,
    padding: 10,
    backgroundColor: "#fffbeb",
    fontSize: 9,
    color: "#92400e",
  },
});

function formatDate(value: string, locale: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleDateString(locale);
}

/** Document PDF React — miroir de FinancePlaquetteScreen. */
export function FinancePlaquettePdfDoc({
  item,
  prestation,
  money,
  locale,
  labels,
}: Props) {
  const brief = item.plaquette;
  const isQuote = item.kind === "DEVIS";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.hero}>
          <Text style={styles.brand}>GSMS</Text>
          <Text style={styles.title}>
            {isQuote ? labels.docQuote : labels.docInvoice}
          </Text>
          <Text style={styles.ref}>{item.reference}</Text>
          <View style={styles.metaRow}>
            <Text style={{ color: "#ffffff99", fontSize: 9 }}>
              {labels.issuedOn.replace(
                "{{date}}",
                formatDate(item.issuedAt, locale),
              )}
            </Text>
            {item.validUntil ? (
              <Text style={{ color: "#ffffff99", fontSize: 9 }}>
                {labels.validUntil.replace(
                  "{{date}}",
                  formatDate(item.validUntil, locale),
                )}
              </Text>
            ) : null}
          </View>
          <Text style={styles.label}>{item.label}</Text>
          {prestation ? (
            <Text style={styles.mission}>
              {labels.mission.replace("{{title}}", prestation.title)}
            </Text>
          ) : null}
        </View>

        <View style={styles.body}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{labels.sectionContext}</Text>
            <Text style={styles.para}>{brief.context}</Text>
            {prestation ? (
              <View style={styles.box}>
                <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 4 }}>
                  {prestation.title}
                </Text>
                <Text style={styles.para}>{prestation.summary}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{labels.sectionFindings}</Text>
            {brief.findings.map((f) => (
              <View key={f.title} style={styles.finding} wrap={false}>
                <Text style={styles.findingTitle}>{f.title}</Text>
                <Text style={styles.para}>{f.detail}</Text>
              </View>
            ))}
            <Text style={styles.source}>{brief.sourceNote}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{labels.sectionLines}</Text>
            {item.lines.map((line) => (
              <View key={line.label} style={styles.lineRow} wrap={false}>
                <View>
                  <Text style={styles.lineLabel}>{line.label}</Text>
                  <Text style={styles.lineDetail}>{line.detail}</Text>
                </View>
                <Text style={styles.amount}>{money(line.amountEur)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{labels.totalTtc}</Text>
              <Text style={styles.totalValue}>{money(item.amountEur)}</Text>
            </View>
          </View>

          <View style={[styles.section, styles.twoCol]}>
            <View style={styles.col}>
              <Text style={styles.sectionTitle}>
                {labels.sectionDeliverables}
              </Text>
              {brief.deliverables.map((d) => (
                <Text key={d} style={styles.bullet}>
                  • {d}
                </Text>
              ))}
            </View>
            <View style={styles.col}>
              <Text style={styles.sectionTitle}>
                {labels.sectionConditions}
              </Text>
              {brief.conditions.map((c) => (
                <Text key={c} style={styles.bullet}>
                  • {c}
                </Text>
              ))}
            </View>
          </View>

          {item.paymentNote ? (
            <Text style={styles.payNote}>{item.paymentNote}</Text>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{labels.sectionSignature}</Text>
            {item.signedAt ? (
              <Text style={styles.signed}>
                {labels.signedBadge.replace(
                  "{{date}}",
                  formatDate(item.signedAt, locale),
                )}
              </Text>
            ) : (
              <View style={styles.signRow}>
                <View style={styles.signBox}>
                  <Text>{labels.signClient}</Text>
                </View>
                <View style={styles.signBox}>
                  <Text>{labels.signGsms}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}
