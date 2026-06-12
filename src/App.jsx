import { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabase";

// ── Données initiales ─────────────────────────────────────────────────────────
const INITIAL_ARTICLES = [
  { id: "ART-01", nom: "Farine T65",       unite: "kg",         stock: 18, seuil: 10, prix: 1.50  },
  { id: "ART-02", nom: "Riz basmati",      unite: "kg",         stock: 32, seuil: 10, prix: 2.20  },
  { id: "ART-03", nom: "Huile d'olive",    unite: "bouteilles", stock: 3,  seuil: 5,  prix: 8.50  },
  { id: "ART-04", nom: "Sucre roux",       unite: "kg",         stock: 4,  seuil: 5,  prix: 1.80  },
  { id: "ART-05", nom: "Pâtes rigatoni",   unite: "kg",         stock: 22, seuil: 8,  prix: 1.90  },
  { id: "ART-06", nom: "Sauce tomate",     unite: "boîtes",     stock: 14, seuil: 6,  prix: 1.20  },
  { id: "ART-07", nom: "Lait entier",      unite: "litres",     stock: 0,  seuil: 6,  prix: 1.10  },
  { id: "ART-08", nom: "Lentilles vertes", unite: "kg",         stock: 9,  seuil: 4,  prix: 2.50  },
  { id: "ART-09", nom: "Sel de mer",       unite: "kg",         stock: 7,  seuil: 2,  prix: 0.90  },
  { id: "ART-10", nom: "Café moulu",       unite: "kg",         stock: 2,  seuil: 3,  prix: 12.00 },
];

const INITIAL_COMMANDES = [
  { id: "CMD-047", client: "Marie Fontaine",  date: "10/06/2025", statut: "en_attente",
    lignes: [{ artId: "ART-01", qte: 2 }, { artId: "ART-03", qte: 1 }, { artId: "ART-04", qte: 1 }] },
  { id: "CMD-046", client: "Thomas Bernard",  date: "10/06/2025", statut: "en_attente",
    lignes: [{ artId: "ART-05", qte: 3 }, { artId: "ART-06", qte: 2 }] },
  { id: "CMD-048", client: "Paul Mercier",    date: "11/06/2025", statut: "en_attente",
    lignes: [{ artId: "ART-02", qte: 5 }] },
  { id: "CMD-049", client: "Julie Renard",    date: "11/06/2025", statut: "en_attente",
    lignes: [{ artId: "ART-07", qte: 2 }, { artId: "ART-08", qte: 1 }] },
  { id: "CMD-050", client: "Ahmed Benali",    date: "12/06/2025", statut: "en_attente",
    lignes: [{ artId: "ART-10", qte: 1 }, { artId: "ART-09", qte: 2 }] },
  { id: "CMD-044", client: "Sophie Durand",   date: "09/06/2025", statut: "livree",
    lignes: [{ artId: "ART-02", qte: 5 }, { artId: "ART-08", qte: 2 }] },
  { id: "CMD-043", client: "Lucas Petit",     date: "09/06/2025", statut: "annulee",
    lignes: [{ artId: "ART-01", qte: 4 }] },
  { id: "CMD-042", client: "Claire Morin",    date: "08/06/2025", statut: "livree",
    lignes: [{ artId: "ART-05", qte: 2 }, { artId: "ART-06", qte: 3 }] },
];

const INITIAL_HISTORIQUE = [
  { id: 1, date: "09/06/2025 14:22", artId: "ART-02", artNom: "Riz basmati",      type: "sortie", qte: 5,  motif: "Livraison CMD-044", prixUnit: 2.20 },
  { id: 2, date: "09/06/2025 14:22", artId: "ART-08", artNom: "Lentilles vertes", type: "sortie", qte: 2,  motif: "Livraison CMD-044", prixUnit: 2.50 },
  { id: 3, date: "08/06/2025 10:05", artId: "ART-05", artNom: "Pâtes rigatoni",   type: "sortie", qte: 2,  motif: "Livraison CMD-042", prixUnit: 1.90 },
  { id: 4, date: "07/06/2025 09:00", artId: "ART-01", artNom: "Farine T65",       type: "entree", qte: 20, motif: "Réapprovisionnement",  prixUnit: 0    },
];

// ── Utilitaires ───────────────────────────────────────────────────────────────
const stockStatus = (art) => {
  if (art.stock === 0) return "rupture";
  if (art.stock <= art.seuil) return "alerte";
  return "ok";
};

const today = () => new Date().toLocaleDateString("fr-FR");
const now = () => new Date().toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const histToDb = (h) => ({ date: h.date, art_id: h.artId, art_nom: h.artNom, type: h.type, qte: h.qte, motif: h.motif, prix_unit: h.prixUnit || 0 });
const dbToHist = (h) => ({ id: h.id, date: h.date, artId: h.art_id, artNom: h.art_nom, type: h.type, qte: h.qte, motif: h.motif, prixUnit: h.prix_unit || 0 });
const fmtEur = (n) => Number(n || 0).toFixed(2).replace(".", ",") + " €";

// ── Palette ───────────────────────────────────────────────────────────────────
const css = {
  ink: "#1A1A2E", inkSoft: "#5A5A7A", inkGhost: "#A0A0C0",
  bg: "#F0F0F8", surface: "#FFFFFF", border: "#E2E2EF",
  primary: "#3D5AFE", primaryLt: "#EEF1FF",
  success: "#00B37E", successLt: "#E6FAF5",
  warn: "#FF6B2B", warnLt: "#FFF0EA",
  danger: "#E53935", dangerLt: "#FDEAEA",
};

// ── Composants UI ─────────────────────────────────────────────────────────────
function Tag({ status }) {
  const cfg = {
    en_attente: { bg: "#FFF3E0", color: "#E65100", label: "En attente" },
    livree:     { bg: css.successLt, color: "#007A55", label: "Livrée ✓" },
    annulee:    { bg: "#F5F5F5", color: "#999", label: "Annulée" },
    ok:         { bg: css.successLt, color: css.success, label: "✓ OK" },
    alerte:     { bg: css.warnLt, color: css.warn, label: "⚠ Alerte" },
    rupture:    { bg: css.dangerLt, color: css.danger, label: "Rupture" },
  }[status] || { bg: "#eee", color: "#999", label: status };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", height: 26, padding: "0 10px",
      borderRadius: 99, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color, whiteSpace: "nowrap" }}>
      {cfg.label}
    </span>
  );
}

function StockBar({ art }) {
  const st = stockStatus(art);
  const pct = art.seuil > 0 ? Math.min(100, Math.round((art.stock / (art.seuil * 2.5)) * 100)) : 0;
  const fillColor = st === "ok" ? css.success : st === "alerte" ? css.warn : css.danger;
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: css.inkSoft, marginBottom: 5 }}>
        <span>
          <strong style={{ color: st === "rupture" ? css.danger : css.ink, fontSize: 18, fontWeight: 800 }}>
            {art.stock}
          </strong>{" "}{art.unite}
        </span>
        <span>Seuil : {art.seuil} {art.unite}</span>
      </div>
      <div style={{ height: 5, background: css.border, borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: fillColor, borderRadius: 99, transition: "width .4s" }} />
      </div>
    </div>
  );
}

function Toast({ msg }) {
  return (
    <div style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
      background: css.ink, color: "#fff", padding: "12px 20px", borderRadius: 12, fontSize: 14,
      fontWeight: 600, zIndex: 999, boxShadow: "0 8px 24px rgba(0,0,0,.25)", maxWidth: 320,
      textAlign: "center", animation: "fadeup .25s ease" }}>
      {msg}
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{ background: css.surface, borderRadius: 12, border: `1.5px solid ${css.border}`,
      display: "flex", alignItems: "center", padding: "0 14px", height: 44, gap: 10, marginBottom: 14 }}>
      <span style={{ fontSize: 16, color: css.inkGhost }}>🔍</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ border: "none", outline: "none", flex: 1, fontSize: 15, color: css.ink, background: "transparent" }} />
      {value && (
        <span style={{ cursor: "pointer", color: css.inkGhost, fontSize: 18 }} onClick={() => onChange("")}>×</span>
      )}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase",
      color: css.inkGhost, margin: "18px 0 8px 2px" }}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", style: s = {} }) {
  const base = { width: "100%", height: 50, border: "none", borderRadius: 14, fontSize: 15,
    fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 };
  const variants = {
    primary:   { background: css.primary, color: "#fff" },
    secondary: { background: "transparent", color: css.inkSoft, border: `1.5px solid ${css.border}` },
    success:   { background: css.success, color: "#fff" },
    danger:    { background: css.dangerLt, color: css.danger, border: `1.5px solid ${css.danger}` },
  };
  return <button onClick={onClick} style={{ ...base, ...variants[variant], ...s }}>{children}</button>;
}

// ══════════════════════════════════════════════════════════════════════════════
//  ÉCRANS
// ══════════════════════════════════════════════════════════════════════════════

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ articles, commandes, setScreen, setSelectedCmd }) {
  const attente = commandes.filter(c => c.statut === "en_attente");
  const livrees = commandes.filter(c => c.statut === "livree");
  const alertes = articles.filter(a => stockStatus(a) !== "ok");
  const ruptures = articles.filter(a => stockStatus(a) === "rupture");

  return (
    <div style={{ padding: "16px 16px 80px", overflowY: "auto", flex: 1 }}>
      {alertes.length > 0 && (
        <div style={{ background: css.warnLt, borderLeft: `3px solid ${css.warn}`, borderRadius: 10,
          padding: "12px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10,
          fontSize: 13, color: css.warn, fontWeight: 600 }}>
          ⚠️ {alertes.length} article{alertes.length > 1 ? "s" : ""} sous le seuil d'alerte
        </div>
      )}

      <SectionTitle>Aujourd'hui</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        {[
          { val: attente.length,  label: "En attente",   color: css.primary, items: null },
          { val: livrees.length,  label: "Livrées",      color: css.success, items: null },
          { val: alertes.length,  label: "Alertes stock",color: css.warn,    items: alertes.filter(a => stockStatus(a) === "alerte") },
          { val: ruptures.length, label: "Ruptures",     color: css.danger,  items: ruptures },
        ].map(s => (
          <div key={s.label} style={{ background: css.surface, borderRadius: 14, padding: "14px 14px",
            boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: s.color, letterSpacing: -1, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 11, color: css.inkSoft, marginTop: 4, fontWeight: 500 }}>{s.label}</div>
            {s.items && s.items.length > 0 && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${css.border}` }}>
                {s.items.map(a => (
                  <div key={a.id} style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: css.ink, fontWeight: 600,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>
                      {a.nom}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: s.color,
                      background: s.color + "22", padding: "1px 6px", borderRadius: 99, flexShrink: 0 }}>
                      {a.stock} {a.unite}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <SectionTitle>Actions rapides</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 6 }}>
        {[
          { icon: "🔍", label: "Commandes",    screen: "commandes",    color: css.primaryLt },
          { icon: "📦", label: "Stock",        screen: "stock",        color: css.successLt },
          { icon: "🛒", label: "Vente directe", screen: "vente_directe", color: css.warnLt },
        ].map(q => (
          <div key={q.label} onClick={() => setScreen(q.screen)}
            style={{ background: q.color, borderRadius: 12, border: `1.5px solid ${css.border}`,
              padding: "14px 6px", display: "flex", flexDirection: "column", alignItems: "center",
              gap: 5, fontSize: 11, fontWeight: 600, color: css.inkSoft, cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
            <span style={{ fontSize: 22 }}>{q.icon}</span>{q.label}
          </div>
        ))}
      </div>

      <SectionTitle>Commandes en attente</SectionTitle>
      {attente.length === 0
        ? <div style={{ textAlign: "center", color: css.inkGhost, fontSize: 14, padding: 24 }}>Aucune commande en attente 🎉</div>
        : attente.slice(0, 3).map(cmd => (
          <OrderCard key={cmd.id} cmd={cmd} articles={articles}
            onClick={() => { setSelectedCmd(cmd.id); setScreen("detail_commande"); }} />
        ))
      }
    </div>
  );
}

// ── COMMANDES ─────────────────────────────────────────────────────────────────
function OrderCard({ cmd, articles, onClick }) {
  const artNoms = cmd.lignes.map(l => {
    const a = articles.find(x => x.id === l.artId);
    return a ? a.nom : l.artId;
  });
  return (
    <div onClick={onClick} style={{ background: css.surface, borderRadius: 14, marginBottom: 10,
      overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.06)", cursor: "pointer" }}>
      <div style={{ padding: "14px 16px 10px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: css.primary }}>{cmd.id}</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: css.ink, marginTop: 2 }}>{cmd.client}</div>
          <div style={{ fontSize: 11, color: css.inkGhost, marginTop: 2 }}>{cmd.date}</div>
        </div>
        <Tag status={cmd.statut} />
      </div>
      <div style={{ padding: "10px 16px 14px", borderTop: `1px solid ${css.border}` }}>
        <div style={{ fontSize: 13, color: css.inkSoft }}>
          <strong style={{ color: css.ink }}>{cmd.lignes.length} article{cmd.lignes.length > 1 ? "s" : ""}</strong>
          {" · "}{artNoms.join(", ")}
        </div>
      </div>
    </div>
  );
}

function Commandes({ articles, commandes, setScreen, setSelectedCmd }) {
  const [search, setSearch] = useState("");
  const [filtre, setFiltre] = useState("tous");

  const filtered = useMemo(() => {
    return commandes.filter(cmd => {
      const matchFiltre = filtre === "tous" || cmd.statut === filtre;
      const q = search.toLowerCase();
      const artNoms = cmd.lignes.map(l => (articles.find(x => x.id === l.artId) || { nom: "" }).nom.toLowerCase());
      const matchSearch = !q
        || cmd.id.toLowerCase().includes(q)
        || cmd.client.toLowerCase().includes(q)
        || artNoms.some(n => n.includes(q));
      return matchFiltre && matchSearch;
    });
  }, [commandes, filtre, search, articles]);

  const counts = {
    tous:       commandes.length,
    en_attente: commandes.filter(c => c.statut === "en_attente").length,
    livree:     commandes.filter(c => c.statut === "livree").length,
    annulee:    commandes.filter(c => c.statut === "annulee").length,
  };

  const pills = [
    { key: "tous",       label: `Toutes (${counts.tous})` },
    { key: "en_attente", label: `En attente (${counts.en_attente})` },
    { key: "livree",     label: "Livrées" },
    { key: "annulee",    label: "Annulées" },
  ];

  return (
    <div style={{ padding: "16px 16px 80px", overflowY: "auto", flex: 1 }}>
      <SearchBar value={search} onChange={setSearch} placeholder="Nom, n° commande, article…" />
      <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}>
        {pills.map(p => (
          <div key={p.key} onClick={() => setFiltre(p.key)}
            style={{ height: 32, padding: "0 14px", borderRadius: 99, fontSize: 13, fontWeight: 600,
              border: `1.5px solid ${filtre === p.key ? css.primary : css.border}`,
              background: filtre === p.key ? css.primary : css.surface,
              color: filtre === p.key ? "#fff" : css.inkSoft,
              whiteSpace: "nowrap", cursor: "pointer", display: "flex", alignItems: "center" }}>
            {p.label}
          </div>
        ))}
      </div>
      {filtered.length === 0
        ? <div style={{ textAlign: "center", color: css.inkGhost, fontSize: 14, padding: 32 }}>Aucune commande trouvée</div>
        : filtered.map(cmd => (
          <OrderCard key={cmd.id} cmd={cmd} articles={articles}
            onClick={() => { setSelectedCmd(cmd.id); setScreen("detail_commande"); }} />
        ))
      }
    </div>
  );
}

// ── DÉTAIL COMMANDE ───────────────────────────────────────────────────────────
function DetailCommande({ cmdId, articles, commandes, onValider, setScreen }) {
  const cmd = commandes.find(c => c.id === cmdId);
  const [showModal, setShowModal] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  if (!cmd) return null;

  const lignesDetail = cmd.lignes.map(l => {
    const art = articles.find(a => a.id === l.artId);
    return { ...l, art, stockApres: art ? art.stock - l.qte : 0, pasAssez: art ? art.stock < l.qte : false };
  });

  const hasWarning = lignesDetail.some(l => l.stockApres <= (l.art?.seuil || 0) && l.stockApres >= 0);
  const hasRupture = lignesDetail.some(l => l.pasAssez);

  const handleValider = () => {
    setConfirmed(true);
    setTimeout(() => {
      onValider(cmd.id);
      setShowModal(false);
      setConfirmed(false);
    }, 600);
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
      <div style={{ padding: "16px 16px 80px" }}>
        <SectionTitle>Informations</SectionTitle>
        <div style={{ background: css.surface, borderRadius: 14, padding: 16, marginBottom: 10,
          boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
          {[
            { label: "N° commande", val: <span style={{ fontSize: 13, fontWeight: 700, color: css.primary }}>{cmd.id}</span> },
            { label: "Client",      val: <span style={{ fontSize: 14, fontWeight: 600, color: css.ink }}>{cmd.client}</span> },
            { label: "Date",        val: <span style={{ fontSize: 13, color: css.ink }}>{cmd.date}</span> },
            { label: "Statut",      val: <Tag status={cmd.statut} /> },
          ].map((row, i, arr) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: i < arr.length - 1 ? 10 : 0 }}>
              <span style={{ fontSize: 13, color: css.inkGhost }}>{row.label}</span>
              {row.val}
            </div>
          ))}
        </div>

        <SectionTitle>Articles commandés</SectionTitle>
        <div style={{ background: css.surface, borderRadius: 14, overflow: "hidden", marginBottom: 16,
          boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
          {lignesDetail.map((l, i) => (
            <div key={i} style={{ padding: "14px 16px",
              borderBottom: i < lignesDetail.length - 1 ? `1px solid ${css.border}` : "none",
              display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: css.ink }}>{l.art?.nom || l.artId}</div>
                <div style={{ fontSize: 12, color: css.inkSoft, marginTop: 2 }}>
                  Stock actuel : {l.art?.stock ?? "?"} {l.art?.unite}
                  {l.pasAssez && <span style={{ color: css.danger, fontWeight: 700 }}> ⚠ Insuffisant</span>}
                </div>
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color: css.ink }}>× {l.qte}</span>
            </div>
          ))}
        </div>

        {cmd.statut === "en_attente" && (
          <Btn onClick={() => setShowModal(true)} variant="primary">✓ Valider le retrait</Btn>
        )}
        {cmd.statut === "livree" && (
          <div style={{ textAlign: "center", padding: 16, background: css.successLt, borderRadius: 14,
            color: css.success, fontWeight: 700, fontSize: 15 }}>✓ Commande livrée</div>
        )}
        {cmd.statut === "annulee" && (
          <div style={{ textAlign: "center", padding: 16, background: "#F5F5F5", borderRadius: 14,
            color: "#999", fontWeight: 700, fontSize: 15 }}>Commande annulée</div>
        )}
      </div>

      {/* Bottom sheet de confirmation */}
      {showModal && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(10,10,30,.5)",
          display: "flex", flexDirection: "column", justifyContent: "flex-end", zIndex: 50 }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={{ background: css.surface, borderRadius: "24px 24px 0 0", padding: 20 }}>
            <div style={{ width: 36, height: 4, background: css.border, borderRadius: 99, margin: "0 auto 18px" }} />
            <div style={{ fontSize: 18, fontWeight: 700, color: css.ink, marginBottom: 4 }}>Confirmer le retrait</div>
            <div style={{ fontSize: 13, color: css.inkSoft, marginBottom: 16 }}>Mouvements de stock à appliquer :</div>

            {lignesDetail.map((l, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 0", borderBottom: `1px solid ${css.border}` }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: css.ink }}>{l.art?.nom}</div>
                  <div style={{ fontSize: 12, color: css.inkSoft, marginTop: 2 }}>
                    {l.art?.stock} → {Math.max(0, l.stockApres)} {l.art?.unite}
                  </div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700,
                  color: l.pasAssez ? css.danger : css.warn,
                  background: l.pasAssez ? css.dangerLt : css.warnLt,
                  padding: "4px 10px", borderRadius: 8 }}>
                  −{l.qte}
                </span>
              </div>
            ))}

            {(hasWarning || hasRupture) && (
              <div style={{ margin: "12px 0 0", fontSize: 12, color: css.warn,
                padding: "8px 12px", background: css.warnLt, borderRadius: 8 }}>
                {hasRupture
                  ? "⚠️ Stock insuffisant pour certains articles. La quantité disponible sera déduite."
                  : "⚠️ Certains articles passeront sous le seuil d'alerte après cette livraison."}
              </div>
            )}

            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <Btn onClick={handleValider} variant="success" style={{ opacity: confirmed ? 0.7 : 1 }}>
                {confirmed ? "⏳ En cours…" : "✓ Confirmer la livraison"}
              </Btn>
              <Btn onClick={() => setShowModal(false)} variant="secondary">Annuler</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── STOCK ─────────────────────────────────────────────────────────────────────
function Stock({ articles, setScreen, setSelectedArt }) {
  const [search, setSearch] = useState("");
  const [filtre, setFiltre] = useState("tous");

  const filtered = useMemo(() => articles.filter(a => {
    const st = stockStatus(a);
    const matchFiltre = filtre === "tous" || st === filtre;
    const matchSearch = !search
      || a.nom.toLowerCase().includes(search.toLowerCase())
      || a.id.toLowerCase().includes(search.toLowerCase());
    return matchFiltre && matchSearch;
  }), [articles, filtre, search]);

  const pills = [
    { key: "tous",    label: "Tous" },
    { key: "alerte",  label: "⚠ Alertes" },
    { key: "rupture", label: "🚫 Rupture" },
    { key: "ok",      label: "✅ OK" },
  ];

  return (
    <div style={{ padding: "16px 16px 80px", overflowY: "auto", flex: 1 }}>
      <SearchBar value={search} onChange={setSearch} placeholder="Nom ou référence…" />
      <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto" }}>
        {pills.map(p => (
          <div key={p.key} onClick={() => setFiltre(p.key)}
            style={{ height: 32, padding: "0 14px", borderRadius: 99, fontSize: 13, fontWeight: 600,
              border: `1.5px solid ${filtre === p.key ? css.primary : css.border}`,
              background: filtre === p.key ? css.primary : css.surface,
              color: filtre === p.key ? "#fff" : css.inkSoft,
              whiteSpace: "nowrap", cursor: "pointer", display: "flex", alignItems: "center" }}>
            {p.label}
          </div>
        ))}
      </div>
      {filtered.length === 0
        ? <div style={{ textAlign: "center", color: css.inkGhost, fontSize: 14, padding: 32 }}>Aucun article trouvé</div>
        : filtered.map(art => (
          <div key={art.id} onClick={() => { setSelectedArt(art.id); setScreen("detail_article"); }}
            style={{ background: css.surface, borderRadius: 14, padding: 16, marginBottom: 10,
              boxShadow: "0 1px 4px rgba(0,0,0,.06)", cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: css.ink }}>{art.nom}</div>
                <div style={{ fontSize: 12, color: css.inkGhost, marginTop: 2 }}>{art.id}</div>
              </div>
              <Tag status={stockStatus(art)} />
            </div>
            <StockBar art={art} />
          </div>
        ))
      }
    </div>
  );
}

// ── DÉTAIL ARTICLE ────────────────────────────────────────────────────────────
function DetailArticle({ artId, articles, historique, onMouvement, onSupprimer }) {
  const art = articles.find(a => a.id === artId);
  const [mode, setMode] = useState(null);
  const [qteInput, setQteInput] = useState("");
  const [motifInput, setMotifInput] = useState("");
  const [confirmSuppr, setConfirmSuppr] = useState(false);

  if (!art) return null;
  const hist = historique.filter(h => h.artId === art.id);
  const st = stockStatus(art);

  const handleSubmit = () => {
    const q = parseInt(qteInput);
    if (!q || q <= 0) return;
    onMouvement(art.id, mode, q, motifInput || (mode === "entree" ? "Réapprovisionnement" : "Sortie manuelle"));
    setMode(null); setQteInput(""); setMotifInput("");
  };

  return (
    <div style={{ padding: "16px 16px 80px", overflowY: "auto", flex: 1 }}>
      <div style={{ background: css.surface, borderRadius: 14, padding: 16, marginBottom: 10,
        boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: css.ink }}>{art.nom}</div>
            <div style={{ fontSize: 12, color: css.inkGhost, marginTop: 2 }}>{art.id} · {art.unite}</div>
          </div>
          <Tag status={st} />
        </div>
        <StockBar art={art} />
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <div style={{ flex: 1, padding: "10px 12px", background: css.successLt, borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: css.success, fontWeight: 600 }}>STOCK</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: css.success }}>{art.stock}</div>
          </div>
          <div style={{ flex: 1, padding: "10px 12px", background: css.warnLt, borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: css.warn, fontWeight: 600 }}>SEUIL</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: css.warn }}>{art.seuil}</div>
          </div>
          <div style={{ flex: 1, padding: "10px 12px", background: css.primaryLt, borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: css.primary, fontWeight: 600 }}>PRIX</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: css.primary, marginTop: 3 }}>{fmtEur(art.prix || 0)}</div>
            <div style={{ fontSize: 9, color: css.inkGhost }}>/{art.unite}</div>
          </div>
        </div>
      </div>

      <SectionTitle>Mouvement de stock</SectionTitle>
      <div style={{ display: "flex", gap: 10, marginBottom: mode ? 14 : 0 }}>
        <Btn onClick={() => setMode(mode === "entree" ? null : "entree")}
          variant={mode === "entree" ? "success" : "secondary"} style={{ height: 44, fontSize: 14 }}>
          📥 Entrée
        </Btn>
        <Btn onClick={() => setMode(mode === "sortie" ? null : "sortie")}
          variant={mode === "sortie" ? "danger" : "secondary"} style={{ height: 44, fontSize: 14 }}>
          📤 Sortie
        </Btn>
      </div>

      {mode && (
        <div style={{ background: css.surface, borderRadius: 14, padding: 16, marginTop: 12,
          boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: css.ink, marginBottom: 12 }}>
            {mode === "entree" ? "📥 Ajouter au stock" : "📤 Retirer du stock"}
          </div>
          <label style={{ fontSize: 12, color: css.inkGhost, fontWeight: 600 }}>QUANTITÉ ({art.unite})</label>
          <input type="number" min="1" value={qteInput} onChange={e => setQteInput(e.target.value)}
            placeholder="0"
            style={{ display: "block", width: "100%", marginTop: 6, marginBottom: 12, padding: "10px 14px",
              border: `1.5px solid ${css.border}`, borderRadius: 10, fontSize: 16, outline: "none",
              fontWeight: 700, color: css.ink }} />
          <label style={{ fontSize: 12, color: css.inkGhost, fontWeight: 600 }}>MOTIF (optionnel)</label>
          <input type="text" value={motifInput} onChange={e => setMotifInput(e.target.value)}
            placeholder="Ex. Réapprovisionnement fournisseur"
            style={{ display: "block", width: "100%", marginTop: 6, marginBottom: 14, padding: "10px 14px",
              border: `1.5px solid ${css.border}`, borderRadius: 10, fontSize: 14, outline: "none", color: css.ink }} />
          <Btn onClick={handleSubmit} variant={mode === "entree" ? "success" : "danger"} style={{ height: 46 }}>
            Confirmer
          </Btn>
        </div>
      )}

      {hist.length > 0 && (
        <>
          <SectionTitle>Historique des mouvements</SectionTitle>
          <div style={{ background: css.surface, borderRadius: 14, overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
            {hist.map((h, i) => (
              <div key={h.id} style={{ padding: "12px 16px",
                borderBottom: i < hist.length - 1 ? `1px solid ${css.border}` : "none",
                display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: css.ink }}>{h.motif}</div>
                  <div style={{ fontSize: 11, color: css.inkGhost, marginTop: 2 }}>{h.date}</div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: h.type === "entree" ? css.success : css.danger }}>
                  {h.type === "entree" ? "+" : "−"}{h.qte}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionTitle>Zone dangereuse</SectionTitle>
      {!confirmSuppr ? (
        <Btn onClick={() => setConfirmSuppr(true)} variant="danger" style={{ height: 44 }}>
          🗑 Supprimer cet article
        </Btn>
      ) : (
        <div style={{ background: css.dangerLt, borderRadius: 14, padding: 16,
          border: `1.5px solid ${css.danger}` }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: css.danger, marginBottom: 4 }}>
            Supprimer « {art.nom} » ?
          </div>
          <div style={{ fontSize: 12, color: css.inkSoft, marginBottom: 14 }}>
            Cette action est irréversible. L'historique lié sera conservé.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={() => onSupprimer(art.id)} variant="danger" style={{ height: 42, fontSize: 13 }}>
              Confirmer la suppression
            </Btn>
            <Btn onClick={() => setConfirmSuppr(false)} variant="secondary" style={{ height: 42, fontSize: 13 }}>
              Annuler
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ── IMPORT CSV ────────────────────────────────────────────────────────────────
function ImportCSV({ onImport }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState("");

  const parseCSV = (raw) => {
    setError("");
    const lines = raw.trim().split("\n").filter(l => l.trim());
    if (lines.length === 0) { setPreview([]); return; }
    const skip = lines[0].toLowerCase().includes("numero") || lines[0].toLowerCase().includes("cmd");
    const dataLines = skip ? lines.slice(1) : lines;
    const grouped = {};
    const errs = [];
    dataLines.forEach((line, i) => {
      const parts = line.split(",").map(p => p.trim());
      if (parts.length < 5) { errs.push(`Ligne ${i + 2}: format invalide`); return; }
      const [num, client, artId, artNom, qte] = parts;
      const q = parseInt(qte);
      if (!num || !client || !artId || isNaN(q)) { errs.push(`Ligne ${i + 2}: données manquantes`); return; }
      if (!grouped[num]) grouped[num] = { id: num.startsWith("CMD") ? num : `CMD-${num}`, client, date: today(), statut: "en_attente", lignes: [], _artNoms: [] };
      grouped[num].lignes.push({ artId, qte: q });
      grouped[num]._artNoms.push(artNom);
    });
    if (errs.length) setError(errs.join(" | "));
    setPreview(Object.values(grouped));
  };

  return (
    <div style={{ padding: "16px 16px 80px", overflowY: "auto", flex: 1 }}>
      <div style={{ background: css.warnLt, borderRadius: 12, padding: "12px 14px", marginBottom: 14,
        fontSize: 12, color: css.warn, fontWeight: 600 }}>
        Format CSV attendu :<br />
        <span style={{ fontFamily: "monospace", fontWeight: 400 }}>
          numero, client, ref_article, nom_article, quantite
        </span>
      </div>

      <div style={{ background: css.surface, borderRadius: 14, padding: 14, marginBottom: 14,
        boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: css.inkGhost, marginBottom: 8 }}>COLLER LE CONTENU CSV</div>
        <textarea value={text} onChange={e => { setText(e.target.value); parseCSV(e.target.value); }}
          placeholder={"CMD-051, Jean Martin, ART-01, Farine T65, 3\nCMD-051, Jean Martin, ART-02, Riz basmati, 2"}
          style={{ width: "100%", height: 120, border: `1.5px solid ${css.border}`, borderRadius: 10,
            padding: "10px 12px", fontSize: 12, fontFamily: "monospace", resize: "vertical",
            outline: "none", color: css.ink }} />
        {error && <div style={{ fontSize: 12, color: css.danger, marginTop: 6 }}>⚠ {error}</div>}
      </div>

      {preview.length > 0 && (
        <>
          <SectionTitle>Aperçu — {preview.length} commande{preview.length > 1 ? "s" : ""}</SectionTitle>
          {preview.map(cmd => (
            <div key={cmd.id} style={{ background: css.surface, borderRadius: 14, padding: 14,
              marginBottom: 8, boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: css.primary }}>{cmd.id}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: css.ink }}>{cmd.client}</div>
              <div style={{ fontSize: 12, color: css.inkSoft, marginTop: 4 }}>
                {cmd.lignes.map((l, i) => `${cmd._artNoms[i]} × ${l.qte}`).join(" · ")}
              </div>
            </div>
          ))}
          <Btn onClick={() => { onImport(preview); setText(""); setPreview([]); }} variant="primary">
            Importer {preview.length} commande{preview.length > 1 ? "s" : ""}
          </Btn>
        </>
      )}

      <div style={{ marginTop: 16 }}>
        <SectionTitle>Exemple à copier-coller</SectionTitle>
        <div style={{ background: "#1A1A2E", borderRadius: 12, padding: "12px 14px", fontSize: 11,
          fontFamily: "monospace", color: "#A8E6CF", lineHeight: 1.8 }}>
          CMD-051, Jean Martin, ART-01, Farine T65, 3<br />
          CMD-051, Jean Martin, ART-02, Riz basmati, 2<br />
          CMD-052, Claire Petit, ART-05, Pâtes, 4
        </div>
      </div>
    </div>
  );
}

// ── GRAPHIQUE VENTES PAR JOUR ─────────────────────────────────────────────────
function SalesChart({ historique }) {
  const sorties = historique.filter(h => h.type === "sortie");
  if (sorties.length === 0) {
    return <div style={{ textAlign: "center", color: css.inkGhost, padding: "24px 0", fontSize: 13 }}>Aucune vente enregistrée</div>;
  }

  const getDay = (d) => d.split(" ")[0];
  const sortKey = (d) => {
    const [dy, m, y] = d.split("/");
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(dy)).getTime();
  };

  const byDay = {};
  sorties.forEach(h => {
    const day = getDay(h.date);
    byDay[day] = (byDay[day] || 0) + h.qte;
  });

  const days = Object.keys(byDay).sort((a, b) => sortKey(a) - sortKey(b)).slice(-7);
  const values = days.map(d => byDay[d]);
  const maxVal = Math.max(...values, 1);
  const total = values.reduce((s, v) => s + v, 0);
  const totalCA = sorties.filter(h => days.includes(getDay(h.date)))
    .reduce((s, h) => s + h.qte * (h.prixUnit || 0), 0);

  const barW = 34;
  const gap = 8;
  const chartH = 90;
  const chartW = days.length * (barW + gap);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <div>
          <span style={{ fontSize: 26, fontWeight: 800, color: css.danger }}>{total}</span>
          <span style={{ fontSize: 12, color: css.inkSoft, marginLeft: 5 }}>unités</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: css.primary }}>{fmtEur(totalCA)}</div>
          <div style={{ fontSize: 10, color: css.inkGhost }}>chiffre d'affaires</div>
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${chartW} ${chartH + 28}`} style={{ overflow: "visible" }}>
        <line x1={0} y1={chartH} x2={chartW} y2={chartH} stroke={css.border} strokeWidth="1" />
        {days.map((day, i) => {
          const v = values[i];
          const barH = Math.max(3, (v / maxVal) * chartH);
          const x = i * (barW + gap);
          const isMax = v === maxVal;
          return (
            <g key={day}>
              <rect x={x} y={chartH - barH} width={barW} height={barH}
                fill={isMax ? css.danger : "#FDEAEA"}
                stroke={isMax ? css.danger : "#F5AAAA"}
                strokeWidth="1" rx="5" />
              <text x={x + barW / 2} y={chartH - barH - 5} textAnchor="middle"
                fontSize="11" fill={css.ink} fontWeight="700">{v}</text>
              <text x={x + barW / 2} y={chartH + 16} textAnchor="middle"
                fontSize="9" fill={css.inkGhost}>{day.substring(0, 5)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── HISTORIQUE GLOBAL ─────────────────────────────────────────────────────────
function Historique({ historique }) {
  const [vue, setVue] = useState("mouvements");

  const sortKey = (d) => {
    const [dy, m, y] = d.split("/");
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(dy)).getTime();
  };

  return (
    <div style={{ padding: "16px 16px 80px", overflowY: "auto", flex: 1 }}>
      {/* Onglets */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          { key: "mouvements", label: "Mouvements" },
          { key: "ventes",     label: "📊 Ventes/jour" },
        ].map(t => (
          <div key={t.key} onClick={() => setVue(t.key)}
            style={{ height: 34, padding: "0 16px", borderRadius: 99, fontSize: 13, fontWeight: 600,
              border: `1.5px solid ${vue === t.key ? css.primary : css.border}`,
              background: vue === t.key ? css.primary : css.surface,
              color: vue === t.key ? "#fff" : css.inkSoft,
              cursor: "pointer", display: "flex", alignItems: "center" }}>
            {t.label}
          </div>
        ))}
      </div>

      {/* Vue Mouvements */}
      {vue === "mouvements" && (
        historique.length === 0
          ? <div style={{ textAlign: "center", color: css.inkGhost, fontSize: 14, padding: 32 }}>Aucun mouvement enregistré</div>
          : (
            <div style={{ background: css.surface, borderRadius: 14, overflow: "hidden",
              boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
              {[...historique].reverse().map((h, i, arr) => (
                <div key={h.id} style={{ padding: "12px 16px",
                  borderBottom: i < arr.length - 1 ? `1px solid ${css.border}` : "none",
                  display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: css.ink }}>{h.artNom}</div>
                    <div style={{ fontSize: 12, color: css.inkSoft, marginTop: 2 }}>{h.motif}</div>
                    <div style={{ fontSize: 11, color: css.inkGhost, marginTop: 1 }}>{h.date}</div>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 800,
                    color: h.type === "entree" ? css.success : css.danger,
                    background: h.type === "entree" ? css.successLt : css.dangerLt,
                    padding: "4px 12px", borderRadius: 8 }}>
                    {h.type === "entree" ? "+" : "−"}{h.qte}
                  </span>
                </div>
              ))}
            </div>
          )
      )}

      {/* Vue Ventes par jour */}
      {vue === "ventes" && (() => {
        const sorties = historique.filter(h => h.type === "sortie");
        if (sorties.length === 0) {
          return <div style={{ textAlign: "center", color: css.inkGhost, fontSize: 14, padding: 32 }}>Aucune vente enregistrée</div>;
        }
        const getDay = (d) => d.split(" ")[0];
        const byDay = {};
        sorties.forEach(h => {
          const day = getDay(h.date);
          if (!byDay[day]) byDay[day] = [];
          byDay[day].push(h);
        });
        const days = Object.keys(byDay).sort((a, b) => sortKey(b) - sortKey(a));
        return (
          <>
            <div style={{ background: css.surface, borderRadius: 14, padding: 16,
              boxShadow: "0 1px 4px rgba(0,0,0,.06)", marginBottom: 14 }}>
              <SalesChart historique={historique} />
            </div>
            {days.map(day => {
              const items = byDay[day];
              const total = items.reduce((s, h) => s + h.qte, 0);
              return (
                <div key={day} style={{ background: css.surface, borderRadius: 14, marginBottom: 10,
                  overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
                  <div style={{ padding: "10px 16px", background: css.bg,
                    display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: css.inkSoft }}>{day}</span>
                      <span style={{ fontSize: 11, color: css.danger, marginLeft: 8 }}>−{total} unités</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: css.primary }}>
                      {fmtEur(items.reduce((s, h) => s + h.qte * (h.prixUnit || 0), 0))}
                    </span>
                  </div>
                  {items.map((h, i) => (
                    <div key={i} style={{ padding: "10px 16px", borderTop: `1px solid ${css.border}`,
                      display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: css.ink }}>{h.artNom}</div>
                        <div style={{ fontSize: 11, color: css.inkGhost }}>
                          {h.qte} × {fmtEur(h.prixUnit || 0)} • {h.motif}
                        </div>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 800, color: css.primary, flexShrink: 0, marginLeft: 8 }}>
                        {fmtEur(h.qte * (h.prixUnit || 0))}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </>
        );
      })()}
    </div>
  );
}

// ── VENTE DIRECTE ──────────────────────────────────────────────────────────────
function VenteDirecte({ articles, onVente }) {
  const [search, setSearch] = useState("");
  const [panier, setPanier] = useState({});

  const filtered = useMemo(() => articles.filter(a =>
    !search || a.nom.toLowerCase().includes(search.toLowerCase()) || a.id.toLowerCase().includes(search.toLowerCase())
  ), [articles, search]);

  const addToCart = (artId) => setPanier(prev => ({ ...prev, [artId]: (prev[artId] || 0) + 1 }));

  const updateQte = (artId, delta) => setPanier(prev => {
    const newQte = (prev[artId] || 0) + delta;
    if (newQte <= 0) { const { [artId]: _, ...rest } = prev; return rest; }
    return { ...prev, [artId]: newQte };
  });

  const totalItems = Object.values(panier).reduce((s, q) => s + q, 0);

  const btnCircle = (onClick, content, disabled, color) => (
    <button onClick={onClick} disabled={disabled}
      style={{ width: 30, height: 30, borderRadius: "50%", border: "none",
        background: disabled ? css.border : color, color: disabled ? css.inkGhost : "#fff",
        fontSize: 18, cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {content}
    </button>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Liste articles scrollable */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 8px" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Rechercher un article…" />
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", color: css.inkGhost, fontSize: 14, padding: 32 }}>Aucun article trouvé</div>
        )}
        {filtered.map(art => {
          const inCart = panier[art.id] || 0;
          const st = stockStatus(art);
          return (
            <div key={art.id} style={{ background: css.surface, borderRadius: 14, padding: "12px 16px",
              marginBottom: 8, boxShadow: "0 1px 4px rgba(0,0,0,.06)",
              opacity: art.stock === 0 && inCart === 0 ? 0.5 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: css.ink }}>{art.nom}</div>
                  <div style={{ fontSize: 11, color: css.inkGhost, marginTop: 2 }}>
                    <Tag status={st} />{" "}
                    <span style={{ marginLeft: 4 }}>{art.stock} {art.unite} dispo</span>
                  </div>
                </div>
                {inCart === 0 ? (
                  btnCircle(() => addToCart(art.id), "+", art.stock === 0, css.primary)
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {btnCircle(() => updateQte(art.id, -1), "−", false, css.danger)}
                    <span style={{ fontSize: 17, fontWeight: 800, color: css.ink, minWidth: 22, textAlign: "center" }}>
                      {inCart}
                    </span>
                    {btnCircle(() => updateQte(art.id, +1), "+", inCart >= art.stock, css.primary)}
                  </div>
                )}
              </div>
              {inCart > 0 && inCart >= art.stock && (
                <div style={{ fontSize: 11, color: css.warn, marginTop: 6 }}>⚠️ Stock maximum atteint</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Barre de confirmation sticky */}
      <div style={{ padding: "10px 16px 12px", background: css.surface,
        borderTop: `1px solid ${css.border}`, flexShrink: 0 }}>
        {totalItems > 0 ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: css.inkSoft }}>
                {Object.entries(panier).map(([id, q]) => {
                  const a = articles.find(x => x.id === id);
                  return `${a?.nom || id} ×${q}`;
                }).join(" · ")}
              </span>
              <span style={{ fontSize: 16, fontWeight: 800, color: css.primary, flexShrink: 0, marginLeft: 8 }}>
                {fmtEur(Object.entries(panier).reduce((s, [id, q]) => {
                  const a = articles.find(x => x.id === id);
                  return s + q * (a?.prix || 0);
                }, 0))}
              </span>
            </div>
            <Btn onClick={() => onVente(Object.entries(panier).map(([artId, qte]) => ({ artId, qte })))}
              variant="success" style={{ height: 46 }}>
              ✓ Valider la vente — {totalItems} article{totalItems > 1 ? "s" : ""}
            </Btn>
          </>
        ) : (
          <div style={{ textAlign: "center", fontSize: 13, color: css.inkGhost, padding: "6px 0" }}>
            Appuyez sur « + » pour ajouter des articles
          </div>
        )}
      </div>
    </div>
  );
}

// ── NOUVEL ARTICLE ──────────────────────────────────────────────────────────────
const UNITES = ["kg", "litres", "bouteilles", "boîtes", "unités", "cartons", "sachets", "pièces"];

function NouvelArticle({ articles, onCreer }) {
  const [nom, setNom] = useState("");
  const [unite, setUnite] = useState("kg");
  const [uniteCustom, setUniteCustom] = useState("");
  const [stock, setStock] = useState("");
  const [seuil, setSeuil] = useState("");
  const [prix, setPrix] = useState("");
  const [error, setError] = useState("");

  const uniteFinale = unite === "__autre__" ? uniteCustom.trim() : unite;

  const handleCreer = () => {
    if (!nom.trim()) { setError("Le nom de l'article est requis."); return; }
    if (!uniteFinale) { setError("L'unité est requise."); return; }
    setError("");
    const maxNum = articles
      .map(a => parseInt(a.id.replace("ART-", "")) || 0)
      .reduce((max, n) => Math.max(max, n), 0);
    const newId = `ART-${String(maxNum + 1).padStart(2, "0")}`;
    onCreer({
      id: newId,
      nom: nom.trim(),
      unite: uniteFinale,
      stock: Math.max(0, parseInt(stock) || 0),
      seuil: Math.max(0, parseInt(seuil) || 0),
      prix: Math.max(0, parseFloat(prix.replace(",", ".")) || 0),
    });
  };

  const inputStyle = {
    display: "block", width: "100%", padding: "10px 14px",
    border: `1.5px solid ${css.border}`, borderRadius: 10,
    fontSize: 15, outline: "none", color: css.ink, background: css.surface,
  };

  return (
    <div style={{ padding: "16px 16px 80px", overflowY: "auto", flex: 1 }}>
      <div style={{ background: css.surface, borderRadius: 14, padding: 16, marginBottom: 14,
        boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>

        <div style={{ fontSize: 12, fontWeight: 600, color: css.inkGhost, marginBottom: 6 }}>NOM DE L'ARTICLE *</div>
        <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex. Farine T65"
          style={{ ...inputStyle, marginBottom: 16 }} />

        <div style={{ fontSize: 12, fontWeight: 600, color: css.inkGhost, marginBottom: 6 }}>UNITÉ *</div>
        <select value={unite} onChange={e => setUnite(e.target.value)}
          style={{ ...inputStyle, marginBottom: unite === "__autre__" ? 10 : 16, appearance: "none" }}>
          {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
          <option value="__autre__">Autre…</option>
        </select>
        {unite === "__autre__" && (
          <input value={uniteCustom} onChange={e => setUniteCustom(e.target.value)}
            placeholder="Ex. palettes"
            style={{ ...inputStyle, marginBottom: 16 }} />
        )}

        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: css.inkGhost, marginBottom: 6 }}>STOCK INITIAL</div>
            <input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} placeholder="0"
              style={{ ...inputStyle, fontWeight: 700, fontSize: 18 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: css.warn, marginBottom: 6 }}>SEUIL D'ALERTE</div>
            <input type="number" min="0" value={seuil} onChange={e => setSeuil(e.target.value)} placeholder="0"
              style={{ ...inputStyle, fontWeight: 700, fontSize: 18, color: css.warn }} />
          </div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: css.primary, marginBottom: 6 }}>PRIX DE VENTE (par {uniteFinale || unite})</div>
        <div style={{ position: "relative" }}>
          <input type="number" min="0" step="0.01" value={prix} onChange={e => setPrix(e.target.value)} placeholder="0,00"
            style={{ ...inputStyle, fontWeight: 700, fontSize: 18, color: css.primary, paddingRight: 36 }} />
          <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
            fontSize: 15, fontWeight: 700, color: css.primary, pointerEvents: "none" }}>&#x20AC;</span>
        </div>
      </div>

      {error && (
        <div style={{ background: css.dangerLt, color: css.danger, borderRadius: 10,
          padding: "10px 14px", fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
          ⚠ {error}
        </div>
      )}

      <Btn onClick={handleCreer} variant="primary">+ Créer l'article</Btn>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  APP PRINCIPALE
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [articles, setArticles] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [historique, setHistorique] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setArticles(INITIAL_ARTICLES);
      setCommandes(INITIAL_COMMANDES);
      setHistorique(INITIAL_HISTORIQUE);
      setDbError("Impossible de joindre la base de données. Mode hors-ligne activé.");
      setLoading(false);
    }, 6000);

    (async () => {
      try {
        const [{ data: arts, error: e1 }, { data: cmds, error: e2 }, { data: hist, error: e3 }] = await Promise.all([
          supabase.from("articles").select("*").order("id"),
          supabase.from("commandes").select("*"),
          supabase.from("historique").select("*").order("id", { ascending: false }),
        ]);
        if (e1 || e2 || e3) throw new Error((e1 || e2 || e3).message);
        clearTimeout(timeout);
        if (!arts?.length) {
          await supabase.from("articles").insert(INITIAL_ARTICLES);
          setArticles(INITIAL_ARTICLES);
        } else setArticles(arts);
        if (!cmds?.length) {
          await supabase.from("commandes").insert(INITIAL_COMMANDES);
          setCommandes(INITIAL_COMMANDES);
        } else setCommandes(cmds);
        if (hist?.length) setHistorique(hist.map(dbToHist));
        else if (INITIAL_HISTORIQUE.length) {
          await supabase.from("historique").insert(INITIAL_HISTORIQUE.map(histToDb));
          setHistorique(INITIAL_HISTORIQUE);
        }
      } catch (err) {
        clearTimeout(timeout);
        console.error("Supabase error:", err.message);
        setArticles(INITIAL_ARTICLES);
        setCommandes(INITIAL_COMMANDES);
        setHistorique(INITIAL_HISTORIQUE);
        setDbError("Base de données inaccessible — mode hors-ligne.");
      } finally {
        setLoading(false);
      }
    })();
    return () => clearTimeout(timeout);
  }, []);
  const [screen, setScreen] = useState("dashboard");
  const [selectedCmd, setSelectedCmd] = useState(null);
  const [selectedArt, setSelectedArt] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const handleValider = (cmdId) => {
    const cmd = commandes.find(c => c.id === cmdId);
    if (!cmd) return;
    setArticles(prev => prev.map(art => {
      const ligne = cmd.lignes.find(l => l.artId === art.id);
      if (!ligne) return art;
      return { ...art, stock: Math.max(0, art.stock - ligne.qte) };
    }));
    setCommandes(prev => prev.map(c => c.id === cmdId ? { ...c, statut: "livree" } : c));
    const newEntries = cmd.lignes.map((l, i) => {
      const art = articles.find(a => a.id === l.artId);
      return { id: Date.now() + i, date: now(), artId: l.artId,
        artNom: art?.nom || l.artId, type: "sortie", qte: l.qte, motif: `Livraison ${cmdId}`, prixUnit: art?.prix || 0 };
    });
    setHistorique(prev => [...prev, ...newEntries]);
    cmd.lignes.forEach(l => {
      const art = articles.find(a => a.id === l.artId);
      if (art) supabase.from("articles").update({ stock: Math.max(0, art.stock - l.qte) }).eq("id", l.artId);
    });
    supabase.from("commandes").update({ statut: "livree" }).eq("id", cmdId);
    supabase.from("historique").insert(newEntries.map(histToDb));
    showToast(`✓ ${cmd.client} — commande livrée !`);
    setScreen("commandes");
  };

  const handleMouvement = (artId, type, qte, motif) => {
    const art = articles.find(a => a.id === artId);
    setArticles(prev => prev.map(a => {
      if (a.id !== artId) return a;
      return { ...a, stock: type === "entree" ? a.stock + qte : Math.max(0, a.stock - qte) };
    }));
    setHistorique(prev => [...prev, {
      id: Date.now(), date: now(), artId, artNom: art?.nom || artId, type, qte, motif,
      prixUnit: type === "sortie" ? (art?.prix || 0) : 0,
    }]);
    const newStock = type === "entree" ? art.stock + qte : Math.max(0, art.stock - qte);
    supabase.from("articles").update({ stock: newStock }).eq("id", artId);
    supabase.from("historique").insert([histToDb({ date: now(), artId, artNom: art?.nom || artId, type, qte, motif, prixUnit: type === "sortie" ? (art?.prix || 0) : 0 })]);
    showToast(type === "entree" ? `+${qte} ${art?.unite} ajoutés` : `−${qte} ${art?.unite} retirés`);
  };

  const handleImport = (cmds) => {
    setCommandes(prev => [...cmds, ...prev]);
    supabase.from("commandes").insert(cmds);
    showToast(`${cmds.length} commande${cmds.length > 1 ? "s" : ""} importée${cmds.length > 1 ? "s" : ""} ✓`);
    setScreen("commandes");
  };

  const handleSupprimer = (artId) => {
    const art = articles.find(a => a.id === artId);
    setArticles(prev => prev.filter(a => a.id !== artId));
    supabase.from("articles").delete().eq("id", artId)
      .then(({ error }) => { if (error) console.error("DELETE article:", error.message); });
    showToast(`🗑 ${art?.nom || artId} supprimé`);
    setScreen("stock");
  };

  const handleVente = (lignes) => {
    setArticles(prev => prev.map(art => {
      const ligne = lignes.find(l => l.artId === art.id);
      if (!ligne) return art;
      return { ...art, stock: Math.max(0, art.stock - ligne.qte) };
    }));
    const newEntries = lignes.map((l, i) => {
      const art = articles.find(a => a.id === l.artId);
      return { id: Date.now() + i, date: now(), artId: l.artId,
        artNom: art?.nom || l.artId, type: "sortie", qte: l.qte, motif: "Vente directe", prixUnit: art?.prix || 0 };
    });
    setHistorique(prev => [...prev, ...newEntries]);
    lignes.forEach(l => {
      const art = articles.find(a => a.id === l.artId);
      if (art) supabase.from("articles").update({ stock: Math.max(0, art.stock - l.qte) }).eq("id", l.artId);
    });
    supabase.from("historique").insert(newEntries.map(histToDb));
    const total = lignes.reduce((s, l) => s + l.qte, 0);
    showToast(`✓ Vente enregistrée — ${total} article${total > 1 ? "s" : ""}`);
    setScreen("dashboard");
  };

  const handleCreateArticle = (article) => {
    setArticles(prev => [...prev, article]);
    supabase.from("articles").insert([article])
      .then(({ error }) => { if (error) console.error("INSERT article:", error.message); });
    if (article.stock > 0) {
      setHistorique(prev => [...prev, {
        id: Date.now(), date: now(), artId: article.id,
        artNom: article.nom, type: "entree", qte: article.stock, motif: "Stock initial",
      }]);
      supabase.from("historique").insert([histToDb({ date: now(), artId: article.id, artNom: article.nom, type: "entree", qte: article.stock, motif: "Stock initial", prixUnit: 0 })])
        .then(({ error }) => { if (error) console.error("INSERT historique:", error.message); });
    }
    showToast(`✓ ${article.nom} ajouté au catalogue`);
    setScreen("stock");
  };

  const screenMeta = {
    dashboard:       { title: "StockOp",    sub: today(),                                                                                    action: null },
    commandes:       { title: "Commandes",  sub: `${commandes.filter(c => c.statut === "en_attente").length} en attente`,                    action: { icon: "⬆️", screen: "import" } },
    detail_commande: { title: "← Retour",   sub: selectedCmd,                                                                               back: "commandes" },
    stock:           { title: "Stock",      sub: `${articles.length} articles · ${articles.filter(a => stockStatus(a) !== "ok").length} alertes`, action: { icon: "➕", screen: "nouvel_article" } },
    detail_article:  { title: "← Retour",   sub: selectedArt,                                                                               back: "stock" },
    historique:      { title: "Historique", sub: `${historique.length} mouvements`,                                                         back: "dashboard" },
    import:          { title: "← Retour",   sub: "Importer des commandes",                                                                  back: "commandes" },
    nouvel_article:  { title: "← Retour",   sub: "Nouvel article",                                                                         back: "stock" },
    vente_directe:   { title: "← Retour",   sub: "Vente directe",                                                                          back: "dashboard" },
  };
  const meta = screenMeta[screen] || { title: "StockOp", sub: "" };

  const navItems = [
    { key: "dashboard",  icon: "🏠", label: "Accueil" },
    { key: "commandes",  icon: "📋", label: "Commandes", badge: commandes.filter(c => c.statut === "en_attente").length },
    { key: "stock",      icon: "📦", label: "Stock",     badge: articles.filter(a => stockStatus(a) !== "ok").length },
    { key: "historique", icon: "📊", label: "Historique" },
  ];

  const isBack = ["detail_commande", "detail_article", "import", "historique", "nouvel_article", "vente_directe"].includes(screen);

  return (
    <div style={{ display: "flex", justifyContent: "center", minHeight: "100vh", background: "#D8D8E8",
      padding: "24px 0", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        @keyframes fadeup {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{ width: 375, background: css.bg, borderRadius: 40,
        boxShadow: "0 24px 60px rgba(0,0,0,.22), 0 0 0 1px rgba(255,255,255,.3)",
        overflow: "hidden", display: "flex", flexDirection: "column", height: 812, position: "relative" }}>

        {/* Status bar */}
        <div style={{ background: css.surface, padding: "14px 20px 10px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 12, fontWeight: 600, color: css.ink, flexShrink: 0 }}>
          <span>9:41</span>
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, background: css.ink, borderRadius: "50%" }} />)}
            <div style={{ width: 20, height: 10, border: `1.5px solid ${css.ink}`, borderRadius: 2, position: "relative" }}>
              <div style={{ position: "absolute", top: 2, left: 2, width: 12, height: 6, background: css.ink, borderRadius: 1 }} />
            </div>
          </div>
        </div>

        {/* Header */}
        <div style={{ background: css.surface, padding: "14px 20px 13px",
          borderBottom: `1px solid ${css.border}`, display: "flex",
          justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div onClick={isBack ? () => setScreen(meta.back || "dashboard") : undefined}
            style={{ cursor: isBack ? "pointer" : "default" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: isBack ? css.primary : css.ink }}>
              {isBack ? meta.title : "StockOp"}
            </div>
            <div style={{ fontSize: 13, color: css.inkSoft, marginTop: 1 }}>
              {isBack
                ? screen === "detail_commande" ? commandes.find(c => c.id === selectedCmd)?.client
                : screen === "detail_article"  ? articles.find(a => a.id === selectedArt)?.nom
                : meta.sub
                : meta.sub}
            </div>
          </div>
          {meta.action && (
            <div onClick={() => setScreen(meta.action.screen)}
              style={{ width: 38, height: 38, background: css.primaryLt, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, cursor: "pointer" }}>
              {meta.action.icon}
            </div>
          )}
        </div>

        {/* Bannière erreur DB */}
        {dbError && (
          <div style={{ background: css.warnLt, borderBottom: `1px solid ${css.warn}`,
            padding: "7px 16px", fontSize: 11, color: css.warn, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            ⚠️ {dbError}
          </div>
        )}

        {/* Contenu de l'écran */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {loading && (
            <div style={{ position: "absolute", inset: 0, background: css.bg, zIndex: 20,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 44 }}>📦</div>
              <div style={{ fontSize: 14, color: css.inkSoft, fontWeight: 600 }}>Connexion à la base de données…</div>
            </div>
          )}
          {screen === "dashboard" && (
            <Dashboard articles={articles} commandes={commandes}
              setScreen={setScreen} setSelectedCmd={setSelectedCmd} />
          )}
          {screen === "commandes" && (
            <Commandes articles={articles} commandes={commandes}
              setScreen={setScreen} setSelectedCmd={setSelectedCmd} />
          )}
          {screen === "detail_commande" && (
            <DetailCommande cmdId={selectedCmd} articles={articles} commandes={commandes}
              onValider={handleValider} setScreen={setScreen} />
          )}
          {screen === "stock" && (
            <Stock articles={articles} setScreen={setScreen} setSelectedArt={setSelectedArt} />
          )}
          {screen === "detail_article" && (
            <DetailArticle artId={selectedArt} articles={articles} historique={historique}
              onMouvement={handleMouvement} onSupprimer={handleSupprimer} setScreen={setScreen} />
          )}
          {screen === "historique" && <Historique historique={historique} />}
          {screen === "import" && <ImportCSV onImport={handleImport} setScreen={setScreen} />}
          {screen === "nouvel_article" && (
            <NouvelArticle articles={articles} onCreer={handleCreateArticle} />
          )}
          {screen === "vente_directe" && (
            <VenteDirecte articles={articles} onVente={handleVente} />
          )}
        </div>

        {/* Barre de navigation */}
        <div style={{ background: css.surface, borderTop: `1px solid ${css.border}`,
          display: "flex", paddingBottom: 16, flexShrink: 0 }}>
          {navItems.map(item => (
            <div key={item.key} onClick={() => setScreen(item.key)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                gap: 3, padding: "8px 0", cursor: "pointer", fontSize: 10, fontWeight: 500,
                color: screen === item.key
                  || (item.key === "commandes" && screen === "detail_commande")
                  || (item.key === "stock" && screen === "detail_article")
                  ? css.primary : css.inkGhost }}>
              <div style={{ position: "relative", fontSize: 20, lineHeight: 1 }}>
                {item.icon}
                {item.badge > 0 && (
                  <div style={{ position: "absolute", top: -4, right: -6, background: css.danger,
                    color: "#fff", fontSize: 9, fontWeight: 800, minWidth: 16, height: 16,
                    borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 3px" }}>
                    {item.badge}
                  </div>
                )}
              </div>
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {toast && <Toast msg={toast} />}
    </div>
  );
}
