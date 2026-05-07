// components/modals/WaterWasteModals.jsx

import { useState } from "react";
import { today } from "../../utils.js";
import { ModalShell, FormInput, PillSelector, PhotoPicker, useFormState } from "../ui/index.jsx";

// ── AddWaterModal ─────────────────────────────────────────────────────────────

export function AddWaterModal({ t, onSave, onClose }) {
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("bowl");
  const [note,   setNote]   = useState("");

  const handleSave = () => {
    const ml = parseFloat(amount);
    if (!ml || ml <= 0) return;
    onSave({ kind: "water", date: today(), ml, source, note });
  };

  return (
    <ModalShell
      title={t.water.title}
      onClose={onClose}
      onSave={handleSave}
      saveLabel={t.water.save}
      closeLabel={t.common.close}
      saveDisabled={!amount}
      saveColor="var(--sky)"
    >
      <FormInput
        label={t.water.amount}
        type="number" min="0"
        placeholder={t.water.amountPlaceholder}
        value={amount}
        onChange={e => setAmount(e.target.value)}
      />
      <PillSelector
        label={t.water.source}
        options={t.water.sources}
        value={source}
        onChange={setSource}
        colorClass="sky"
      />
      <FormInput
        label={t.water.note}
        placeholder={t.water.notePlaceholder}
        value={note}
        onChange={e => setNote(e.target.value)}
      />
    </ModalShell>
  );
}

// ── AddWasteModal ─────────────────────────────────────────────────────────────

// Sub-components receive controlled state from the parent so they stay pure.
function PoopForm({ t, form, set }) {
  const tw = t.waste;
  return (
    <>
      <FormInput
        as="select" className="form-select"
        label={tw.poop.color}
        value={form.color}
        onChange={e => set("color", e.target.value)}
      >
        {Object.entries(tw.poop.colors).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </FormInput>
      <PillSelector
        label={tw.poop.consistency}
        options={tw.poop.consistencies}
        value={form.consistency}
        onChange={v => set("consistency", v)}
        colorClass="sage"
      />
      <FormInput
        label={tw.poop.note}
        placeholder={tw.poop.notePlaceholder}
        value={form.note}
        onChange={e => set("note", e.target.value)}
      />
      <PhotoPicker photos={form.photos} onChange={v => set("photos", v)} label={tw.poop.photos} />
    </>
  );
}

function PeeForm({ t, form, set }) {
  const tw = t.waste;
  return (
    <>
      <div className="form-row">
        <FormInput
          label={tw.pee.clumps}
          type="number" min="0"
          placeholder={tw.pee.clumpsPlaceholder}
          value={form.clumps}
          onChange={e => set("clumps", e.target.value)}
        />
        <FormInput
          label={tw.pee.diameter}
          type="number" min="0" step="0.5"
          placeholder={tw.pee.diameterPlaceholder}
          value={form.diameter}
          onChange={e => set("diameter", e.target.value)}
        />
      </div>
      <FormInput
        as="select" className="form-select"
        label={tw.pee.color}
        value={form.color}
        onChange={e => set("color", e.target.value)}
      >
        {Object.entries(tw.pee.colors).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </FormInput>
      <FormInput
        label={tw.pee.note}
        placeholder={tw.pee.notePlaceholder}
        value={form.note}
        onChange={e => set("note", e.target.value)}
      />
      <PhotoPicker photos={form.photos} onChange={v => set("photos", v)} label={tw.pee.photos} />
    </>
  );
}

export function AddWasteModal({ t, onSave, onClose }) {
  const [wasteType, setWasteType] = useState("poop");
  const [poopForm,  setPoopField] = useFormState({ color: "brown", consistency: "normal", note: "", photos: [] });
  const [peeForm,   setPeeField]  = useFormState({ clumps: "", diameter: "", color: "normal", note: "", photos: [] });

  const handleSave = () => {
    const base = { kind: "waste", date: today(), wasteType };
    if (wasteType === "poop") {
      onSave({ ...base, ...poopForm });
    } else {
      onSave({
        ...base,
        ...peeForm,
        clumps:   parseInt(peeForm.clumps)     || 0,
        diameter: parseFloat(peeForm.diameter) || 0,
      });
    }
  };

  return (
    <ModalShell
      title={t.waste.title}
      onClose={onClose}
      onSave={handleSave}
      saveLabel={t.waste.save}
      closeLabel={t.common.close}
      saveColor="var(--sage)"
    >
      <PillSelector
        label={t.waste.type}
        options={t.waste.types}
        value={wasteType}
        onChange={setWasteType}
        colorClass="sage"
      />
      {wasteType === "poop"
        ? <PoopForm t={t} form={poopForm} set={setPoopField} />
        : <PeeForm  t={t} form={peeForm}  set={setPeeField}  />
      }
    </ModalShell>
  );
}
