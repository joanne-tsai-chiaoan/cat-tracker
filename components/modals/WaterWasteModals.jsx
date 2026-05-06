// components/modals/AddWaterModal.jsx

import { useState } from "react";
import { today } from "../../utils.js";

export function AddWaterModal({ t, onSave, onClose }) {
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("bowl");
  const [note, setNote] = useState("");

  const handleSave = () => {
    const ml = parseFloat(amount);
    if (!ml || ml <= 0) return;
    onSave({ kind: "water", date: today(), ml, source, note });
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-title">{t.water.title}</div>

        <div className="form-group">
          <label className="form-label">{t.water.amount}</label>
          <input className="form-input" type="number" min="0"
            placeholder={t.water.amountPlaceholder}
            value={amount} onChange={e => setAmount(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">{t.water.source}</label>
          <div className="pill-row">
            {Object.entries(t.water.sources).map(([k, v]) => (
              <button key={k}
                className={`pill pill-sky${source === k ? " pill-active" : ""}`}
                onClick={() => setSource(k)}>{v}</button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{t.water.note}</label>
          <input className="form-input" placeholder={t.water.notePlaceholder}
            value={note} onChange={e => setNote(e.target.value)} />
        </div>

        <button className="btn btn-primary btn-full" onClick={handleSave}
          style={{ background: "var(--sky)" }} disabled={!amount}>
          {t.water.save}
        </button>
        <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={onClose}>
          {t.common.close}
        </button>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// AddWasteModal

import { PhotoPicker } from "../ui/index.jsx";

export function AddWasteModal({ t, onSave, onClose }) {
  const [wasteType, setWasteType] = useState("poop");

  // poop state
  const [poopColor, setPoopColor] = useState("brown");
  const [poopConsistency, setPoopConsistency] = useState("normal");
  const [poopNote, setPoopNote] = useState("");
  const [poopPhotos, setPoopPhotos] = useState([]);

  // pee state
  const [peeClumps, setPeeClumps] = useState("");
  const [peeDiameter, setPeeDiameter] = useState("");
  const [peeColor, setPeeColor] = useState("normal");
  const [peeNote, setPeeNote] = useState("");
  const [peePhotos, setPeePhotos] = useState([]);

  const handleSave = () => {
    const base = { kind: "waste", date: today(), wasteType };
    if (wasteType === "poop") {
      onSave({ ...base, color: poopColor, consistency: poopConsistency, note: poopNote, photos: poopPhotos });
    } else {
      onSave({
        ...base,
        clumps: parseInt(peeClumps) || 0,
        diameter: parseFloat(peeDiameter) || 0,
        color: peeColor,
        note: peeNote,
        photos: peePhotos,
      });
    }
  };

  const tw = t.waste;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-title">{tw.title}</div>

        {/* Type toggle */}
        <div className="form-group">
          <label className="form-label">{tw.type}</label>
          <div className="pill-row">
            {Object.entries(tw.types).map(([k, v]) => (
              <button key={k}
                className={`pill pill-sage${wasteType === k ? " pill-active" : ""}`}
                onClick={() => setWasteType(k)}>{v}</button>
            ))}
          </div>
        </div>

        {/* ── Poop form ── */}
        {wasteType === "poop" && (
          <>
            <div className="form-group">
              <label className="form-label">{tw.poop.color}</label>
              <select className="form-input form-select"
                value={poopColor} onChange={e => setPoopColor(e.target.value)}>
                {Object.entries(tw.poop.colors).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{tw.poop.consistency}</label>
              <div className="pill-row">
                {Object.entries(tw.poop.consistencies).map(([k, v]) => (
                  <button key={k}
                    className={`pill pill-sage${poopConsistency === k ? " pill-active" : ""}`}
                    onClick={() => setPoopConsistency(k)}>{v}</button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{tw.poop.note}</label>
              <input className="form-input" placeholder={tw.poop.notePlaceholder}
                value={poopNote} onChange={e => setPoopNote(e.target.value)} />
            </div>

            <PhotoPicker photos={poopPhotos} onChange={setPoopPhotos} label={tw.poop.photos} />
          </>
        )}

        {/* ── Pee form ── */}
        {wasteType === "pee" && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{tw.pee.clumps}</label>
                <input className="form-input" type="number" min="0"
                  placeholder={tw.pee.clumpsPlaceholder}
                  value={peeClumps} onChange={e => setPeeClumps(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">{tw.pee.diameter}</label>
                <input className="form-input" type="number" min="0" step="0.5"
                  placeholder={tw.pee.diameterPlaceholder}
                  value={peeDiameter} onChange={e => setPeeDiameter(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{tw.pee.color}</label>
              <select className="form-input form-select"
                value={peeColor} onChange={e => setPeeColor(e.target.value)}>
                {Object.entries(tw.pee.colors).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{tw.pee.note}</label>
              <input className="form-input" placeholder={tw.pee.notePlaceholder}
                value={peeNote} onChange={e => setPeeNote(e.target.value)} />
            </div>

            <PhotoPicker photos={peePhotos} onChange={setPeePhotos} label={tw.pee.photos} />
          </>
        )}

        <button className="btn btn-primary btn-full" onClick={handleSave}
          style={{ background: "var(--sage)" }}>
          {tw.save}
        </button>
        <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={onClose}>
          {t.common.close}
        </button>
      </div>
    </div>
  );
}
