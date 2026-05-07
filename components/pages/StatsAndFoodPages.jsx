// components/pages/StatsAndFoodPages.jsx

import { useState } from "react";
import { last7Days, fmtWeekday } from "../../utils.js";
import { TYPE_COLORS, POOP_CONSISTENCY_COLORS, POOP_COLORS, CHART_PALETTE } from "../../constants.js";
import { PieChart, WeeklyBarChart, SectionHeader, EmptyState, TabSelector, TypeBadge, ActionSheet } from "../ui/index.jsx";

// ── StatsPage ─────────────────────────────────────────────────────────────────
export function StatsPage({ t, logs, foods }) {
  const [tab, setTab] = useState("nutrition");
  const ts = t.stats;

  const mealLogs  = logs.filter(l => l.kind === "meal");
  const waterLogs = logs.filter(l => l.kind === "water");
  const wasteLogs = logs.filter(l => l.kind === "waste");
  const poopLogs  = wasteLogs.filter(l => l.wasteType === "poop");
  const peeLogs   = wasteLogs.filter(l => l.wasteType === "pee");

  return (
    <div>
      <SectionHeader title={ts.title} subtitle={ts.sub} />

      {!logs.length ? (
        <EmptyState icon="📊" title={ts.noData} />
      ) : (
        <>
          <TabSelector
            tabs={[["nutrition", ts.tabNutrition], ["water", ts.tabWater], ["waste", ts.tabWaste]]}
            active={tab}
            onChange={setTab}
            containerClass="stats-tabs"
            itemClass="stats-tab"
          />

          {tab === "nutrition" && <NutritionTab t={t} mealLogs={mealLogs} />}
          {tab === "water"     && <WaterTab     t={t} mealLogs={mealLogs} waterLogs={waterLogs} />}
          {tab === "waste"     && <WasteTab     t={t} poopLogs={poopLogs} peeLogs={peeLogs} />}
        </>
      )}
    </div>
  );
}

// ── Nutrition tab ─────────────────────────────────────────────────────────────
function NutritionTab({ t, mealLogs }) {
  const ts = t.stats;

  const typeCounts = { dry: 0, wet: 0, treat: 0, supplement: 0 };
  const foodCounts = {};
  mealLogs.forEach(log => {
    log.items.forEach(item => {
      typeCounts[item.foodType] = (typeCounts[item.foodType] || 0) + item.grams;
      foodCounts[item.foodName] = (foodCounts[item.foodName] || 0) + item.grams;
    });
  });

  const pieSlices = Object.entries(typeCounts)
    .filter(([, v]) => v > 0)
    .map(([type, value]) => ({ label: ts[type], value, color: TYPE_COLORS[type].bar }));

  const topFoods = Object.entries(foodCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const weeklyKcal = last7Days().map(d => ({
    label: fmtWeekday(d),
    value: mealLogs.filter(l => l.date === d).reduce((s, l) => s + l.totalKcal, 0),
  }));

  return (
    <>
      <div className="card">
        <div className="card-label">{ts.dryWet}</div>
        {pieSlices.length ? <PieChart slices={pieSlices} /> : <EmptyChart />}
      </div>

      <div className="card">
        <div className="card-label">{ts.weeklyKcal}</div>
        <WeeklyBarChart days={weeklyKcal} color="var(--caramel)" />
      </div>

      {topFoods.length > 0 && (
        <div className="card">
          <div className="card-label">{ts.topFoods}</div>
          {topFoods.map(([name, grams], i) => (
            <div key={name} className="top-food-row">
              <span className="top-food-rank">{i + 1}</span>
              <span className="top-food-name">{name}</span>
              <div className="top-food-bar-wrap">
                <div className="top-food-bar"
                  style={{ width: `${(grams / topFoods[0][1]) * 100}%`, background: CHART_PALETTE[i] }} />
              </div>
              <span className="top-food-g">{Math.round(grams)}g</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Water tab ─────────────────────────────────────────────────────────────────
function WaterTab({ t, mealLogs, waterLogs }) {
  const ts = t.stats;

  const weeklyWater = last7Days().map(d => {
    const fromFood  = mealLogs.filter(l => l.date === d).reduce((s, l) => s + (l.totalWaterFromFood || 0), 0);
    const fromDrink = mealLogs.filter(l => l.date === d).reduce((s, l) => s + (l.extraWaterMl || 0), 0)
                    + waterLogs.filter(l => l.date === d).reduce((s, l) => s + l.ml, 0);
    return { label: fmtWeekday(d), value: fromFood + fromDrink, fromFood, fromDrink };
  });

  const totalFromFood  = mealLogs.reduce((s, l) => s + (l.totalWaterFromFood || 0), 0);
  const totalFromDrink = mealLogs.reduce((s, l) => s + (l.extraWaterMl      || 0), 0)
                       + waterLogs.reduce((s, l) => s + l.ml, 0);

  const pieSlices = [
    { label: ts.fromFood, value: totalFromFood,  color: "var(--sky)" },
    { label: ts.drinking, value: totalFromDrink, color: "#a0d0e8" },
  ].filter(sl => sl.value > 0);

  return (
    <>
      <div className="card">
        <div className="card-label">{ts.weeklyWater}</div>
        <WeeklyBarChart days={weeklyWater} color="var(--sky)" />
      </div>
      <div className="card">
        <div className="card-label">{ts.waterBreakdown}</div>
        {pieSlices.length ? <PieChart slices={pieSlices} /> : <EmptyChart />}
      </div>
    </>
  );
}

// ── Waste tab ─────────────────────────────────────────────────────────────────
function WasteTab({ t, poopLogs, peeLogs }) {
  const ts = t.stats;
  const tw = t.waste;

  const consistencySlices = Object.entries(
    poopLogs.reduce((acc, l) => { acc[l.consistency] = (acc[l.consistency] || 0) + 1; return acc; }, {})
  ).map(([k, v]) => ({ label: tw.poop.consistencies[k], value: v, color: POOP_CONSISTENCY_COLORS[k] || "#ccc" }));

  const colorSlices = Object.entries(
    poopLogs.reduce((acc, l) => { acc[l.color] = (acc[l.color] || 0) + 1; return acc; }, {})
  ).map(([k, v]) => ({ label: tw.poop.colors[k], value: v, color: POOP_COLORS[k] || "#ccc" }));

  const withDiam  = peeLogs.filter(l => l.diameter > 0);
  const peeClumpsAvg = peeLogs.length
    ? (peeLogs.reduce((s, l) => s + (l.clumps || 0), 0) / peeLogs.length).toFixed(1) : "—";
  const peeDiamAvg   = withDiam.length
    ? (withDiam.reduce((s, l) => s + l.diameter, 0) / withDiam.length).toFixed(1) : "—";

  return (
    <>
      {poopLogs.length > 0 && (
        <>
          <div className="card">
            <div className="card-label">{ts.poopConsistency}</div>
            <PieChart slices={consistencySlices} />
          </div>
          <div className="card">
            <div className="card-label">{ts.poopColor}</div>
            <PieChart slices={colorSlices} />
          </div>
        </>
      )}

      {peeLogs.length > 0 && (
        <div className="card">
          <div className="card-label">💧 {tw.types.pee}</div>
          <div className="stat-number-row">
            <div className="stat-number-chip">
              <div className="val">{peeClumpsAvg}</div>
              <span className="unit">{ts.peeAvgClumps}</span>
            </div>
            <div className="stat-number-chip">
              <div className="val">{peeDiamAvg}</div>
              <span className="unit">{ts.peeAvgDiameter} (cm)</span>
            </div>
          </div>
        </div>
      )}

      {!poopLogs.length && !peeLogs.length && <EmptyChart />}
    </>
  );
}

function EmptyChart() {
  return <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px 0", fontSize: 13 }}>—</div>;
}

// ── FoodDbPage ────────────────────────────────────────────────────────────────
export function FoodDbPage({ t, foods, onAdd, onEdit, onDelete }) {
  const [search,     setSearch]     = useState("");
  const [detailFood, setDetailFood] = useState(null);
  const tf = t.foodDb;

  const filtered = foods.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.brand || "").toLowerCase().includes(search.toLowerCase())
  );

  const grouped = ["dry", "wet", "treat", "supplement"].reduce((acc, type) => {
    acc[type] = filtered.filter(f => f.type === type);
    return acc;
  }, {});

  return (
    <div>
      <SectionHeader title={tf.title} subtitle={tf.sub} />

      <input className="form-input search-input" placeholder={`🔍  ${tf.search}`}
        value={search} onChange={e => setSearch(e.target.value)} />

      {!foods.length && (
        <EmptyState icon="🗃" title={tf.noFoods} subtitle={tf.noFoodsSub} />
      )}

      {["dry", "wet", "treat", "supplement"].map(type =>
        grouped[type].length > 0 && (
          <div key={type} className="card">
            <div className="food-type-header">
              <TypeBadge type={type} label={tf.types[type]} />
            </div>
            {grouped[type].map(food => (
              <FoodRow key={food.id} food={food} t={t}
                onTap={() => setDetailFood(food)}
                onEdit={() => onEdit(food)}
                onDelete={() => onDelete(food.id)}
              />
            ))}
          </div>
        )
      )}

      {detailFood && (
        <FoodDetailSheet food={detailFood} t={t}
          onEdit={() => { setDetailFood(null); onEdit(detailFood); }}
          onDelete={() => { setDetailFood(null); onDelete(detailFood.id); }}
          onClose={() => setDetailFood(null)}
        />
      )}

      <button className="fab" onClick={onAdd} aria-label="Add food">＋</button>
    </div>
  );
}

function FoodRow({ food, t, onTap, onEdit, onDelete }) {
  const tf = t.foodDb;
  const [sheet, setSheet] = useState(false);

  const handleContextMenu = (e) => {
    e.preventDefault();
    setSheet(true);
  };

  return (
    <>
      <div className="food-db-row" onClick={onTap} onContextMenu={handleContextMenu}>
        <div className="food-db-info">
          <div className="food-db-name">{food.name}</div>
          <div className="food-db-meta">
            {food.brand && `${food.brand} · `}
            {food.kcalPer100g} kcal · {food.proteinPer100g}g protein · 💧{food.waterPer100g}%
            <span> {tf.perHundred}</span>
          </div>
          {food.subtype && (
            <div className="food-db-sub">
              {tf.subtypes[food.type]?.[food.subtype] || food.subtype}
            </div>
          )}
        </div>
      </div>
      {sheet && (
        <ActionSheet
          onClose={() => setSheet(false)}
          items={[
            { label: tf.edit || "Edit", icon: "✏️", onClick: () => { setSheet(false); onEdit(); } },
            { label: t.common.delete, icon: "🗑", danger: true, onClick: () => { setSheet(false); onDelete(); } },
          ]}
        />
      )}
    </>
  );
}

function FoodDetailSheet({ food, t, onEdit, onDelete, onClose }) {
  const tf = t.foodDb;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="food-detail-header">
          <div>
            <div className="food-detail-name">{food.name}</div>
            {food.brand && <div className="food-detail-brand">{food.brand}</div>}
          </div>
          <div className="food-detail-actions">
            <button className="btn btn-ghost btn-sm" onClick={onEdit}>✏️</button>
            <button className="btn btn-danger btn-sm" onClick={onDelete}>🗑</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, margin: "10px 0 14px" }}>
          <TypeBadge type={food.type} label={tf.types[food.type]} />
          {food.subtype && (
            <span className="food-db-sub" style={{ margin: 0, alignSelf: "center" }}>
              {tf.subtypes[food.type]?.[food.subtype] || food.subtype}
            </span>
          )}
        </div>

        <div className="food-detail-stats">
          <div className="food-detail-stat">
            <div className="food-detail-stat-val">{food.kcalPer100g}</div>
            <div className="food-detail-stat-label">kcal / 100g</div>
          </div>
          <div className="food-detail-stat">
            <div className="food-detail-stat-val">{food.proteinPer100g}g</div>
            <div className="food-detail-stat-label">protein / 100g</div>
          </div>
          <div className="food-detail-stat">
            <div className="food-detail-stat-val">{food.waterPer100g}%</div>
            <div className="food-detail-stat-label">moisture</div>
          </div>
        </div>

        <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={onClose}>
          {t.foodDb.cancel || t.common.close || "Close"}
        </button>
      </div>
    </div>
  );
}
