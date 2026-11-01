// Bestelling: sleutel "persoon|itemId" -> aantal. Bedragen worden in centen
// berekend om afrondingsverschillen te voorkomen.
const OPSLAG_SLEUTEL = "frituur-bestelling";
const items = Object.fromEntries(MENU.flatMap((c) => c.items).map((i) => [i.id, i]));
const centen = (prijs) => Math.round(prijs * 100);
const euro = (c) => "€ " + (c / 100).toFixed(2).replace(".", ",");

let bestelling = laad();
const persoonVeld = document.getElementById("persoon");

function laad() {
  try {
    const data = JSON.parse(localStorage.getItem(OPSLAG_SLEUTEL)) || {};
    // Verwijder regels van producten die niet meer op de menukaart staan.
    return Object.fromEntries(
      Object.entries(data).filter(([k, n]) => items[k.split("|")[1]] && n > 0)
    );
  } catch {
    return {};
  }
}

function bewaar() {
  localStorage.setItem(OPSLAG_SLEUTEL, JSON.stringify(bestelling));
}

// "|" wordt verwijderd omdat dat teken de sleutel scheidt.
const huidigePersoon = () => persoonVeld.value.replace(/\|/g, "").trim();
const sleutel = (persoon, id) => persoon + "|" + id;

function wijzig(id, delta) {
  const k = sleutel(huidigePersoon(), id);
  const nieuw = (bestelling[k] || 0) + delta;
  if (nieuw > 0) bestelling[k] = nieuw;
  else delete bestelling[k];
  bewaar();
  render();
}

function regels() {
  return Object.entries(bestelling).map(([k, aantal]) => {
    const [persoon, id] = k.split("|");
    const item = items[id];
    return { persoon, item, aantal, bedrag: centen(item.prijs) * aantal };
  });
}

function renderMenu() {
  const menu = document.getElementById("menu");
  menu.innerHTML = "";
  const persoon = huidigePersoon();
  for (const cat of MENU) {
    const sectie = document.createElement("div");
    sectie.className = "categorie";
    sectie.innerHTML = `<h2>${cat.categorie}</h2>`;
    for (const item of cat.items) {
      const aantal = bestelling[sleutel(persoon, item.id)] || 0;
      const rij = document.createElement("div");
      rij.className = "item";
      rij.innerHTML = `
        <span class="naam">${item.naam}</span>
        <span class="prijs">${euro(centen(item.prijs))}</span>
        <span class="teller">
          <button class="rond" type="button" data-id="${item.id}" data-delta="-1"
            aria-label="${item.naam} minder" ${aantal ? "" : "disabled"}>−</button>
          <span>${aantal}</span>
          <button class="rond" type="button" data-id="${item.id}" data-delta="1"
            aria-label="${item.naam} erbij">+</button>
        </span>`;
      sectie.appendChild(rij);
    }
    menu.appendChild(sectie);
  }
}

function renderBestelling() {
  const doel = document.getElementById("regels");
  const lijst = regels();
  if (!lijst.length) {
    doel.innerHTML = '<p class="leeg">Nog niets gekozen.</p>';
  } else {
    doel.innerHTML = "";
    for (const r of lijst) {
      const div = document.createElement("div");
      div.className = "regel";
      const wie = r.persoon ? ` <small>(${escape(r.persoon)})</small>` : "";
      div.innerHTML = `<span>${r.aantal}× ${r.item.naam}${wie}</span><span>${euro(r.bedrag)}</span>`;
      doel.appendChild(div);
    }
  }
  const totaal = lijst.reduce((s, r) => s + r.bedrag, 0);
  document.getElementById("totaal").textContent = euro(totaal);
  document.getElementById("toon-overzicht").disabled = !lijst.length;
  document.getElementById("leegmaken").disabled = !lijst.length;
}

function escape(tekst) {
  const d = document.createElement("div");
  d.textContent = tekst;
  return d.innerHTML;
}

function render() {
  renderMenu();
  renderBestelling();
}

// Tekst voor aan de balie: eerst alles opgeteld per product (in menuvolgorde),
// daarna per persoon wat ieder moet betalen.
function overzichtTekst() {
  const lijst = regels();
  const perItem = {};
  for (const r of lijst) perItem[r.item.id] = (perItem[r.item.id] || 0) + r.aantal;

  let tekst = "BESTELLING\n";
  for (const cat of MENU) {
    for (const item of cat.items) {
      if (perItem[item.id]) tekst += `${perItem[item.id]}× ${item.naam}\n`;
    }
  }
  const totaal = lijst.reduce((s, r) => s + r.bedrag, 0);
  tekst += `\nTotaal: ${euro(totaal)}\n`;

  const perPersoon = {};
  for (const r of lijst) {
    const wie = r.persoon || "Zonder naam";
    perPersoon[wie] = (perPersoon[wie] || 0) + r.bedrag;
  }
  if (Object.keys(perPersoon).length > 1) {
    tekst += "\nPER PERSOON\n";
    for (const [wie, bedrag] of Object.entries(perPersoon)) {
      tekst += `${wie}: ${euro(bedrag)}\n`;
    }
  }
  return tekst;
}

document.getElementById("menu").addEventListener("click", (e) => {
  const knop = e.target.closest("button[data-id]");
  if (knop) wijzig(knop.dataset.id, Number(knop.dataset.delta));
});

persoonVeld.addEventListener("input", renderMenu);

document.getElementById("leegmaken").addEventListener("click", () => {
  if (confirm("Hele bestelling leegmaken?")) {
    bestelling = {};
    bewaar();
    render();
  }
});

const dialoog = document.getElementById("overzicht");
document.getElementById("toon-overzicht").addEventListener("click", () => {
  document.getElementById("overzicht-tekst").textContent = overzichtTekst();
  dialoog.showModal();
});
document.getElementById("sluiten").addEventListener("click", () => dialoog.close());
document.getElementById("kopieer").addEventListener("click", async () => {
  const knop = document.getElementById("kopieer");
  try {
    await navigator.clipboard.writeText(overzichtTekst());
    knop.textContent = "Gekopieerd";
  } catch {
    knop.textContent = "Kopiëren mislukt";
  }
  setTimeout(() => (knop.textContent = "Kopiëren"), 1500);
});

render();
