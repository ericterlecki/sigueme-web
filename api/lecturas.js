// Lecturas de la misa del día, desde el servicio de Evangelizo («Evangelio del día»).
// La app las pide a /api/lecturas?fecha=AAAA-MM-DD. Vercel guarda la respuesta unas horas.
module.exports = async (req, res) => {
  const q = (req.query && req.query.fecha) || "";
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : hoy;
  try {
    const r = await fetch(`https://publication.evangelizo.ws/SP/days/${fecha}`, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; SiguemeApp/1.0)" }
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    const x = (j && j.data) || {};
    const lecturas = (x.readings || []).map(l => ({
      tipo: l.type || "",
      titulo: l.title || "",
      cita: l.reference_displayed || "",
      texto: l.text || "",
      fuente: l.source || ""
    })).filter(l => l.texto);
    if (!lecturas.length) throw new Error("sin lecturas");
    const c = x.commentary || null;
    const comentario = c && (c.description || c.text) ? {
      titulo: c.title || "",
      texto: c.description || c.text || "",
      autor: (c.author && (c.author.name || c.author)) || "",
      fuente: c.source || ""
    } : null;
    const lista = x.saints || x.saint || x.santos || [];
    const santos = (Array.isArray(lista) ? lista : [lista]).map(t => ({
      nombre: (t && (t.name || t.title || t.nombre)) || "",
      texto: (t && (t.description || t.biography || t.summary || t.text)) || ""
    })).filter(t => t.nombre);
    res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
    res.status(200).json({
      fecha,
      dia: x.date_displayed || "",
      liturgia: { titulo: (x.liturgy && x.liturgy.title) || "", descripcion: (x.liturgy && x.liturgy.description) || "" },
      lecturas,
      comentario,
      santos
    });
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ error: "no-disponible", fecha });
  }
};
