import { config } from '../config.js';
import { intakeSuggestQuerySchema } from '../validation.js';
import { chatWithGroq } from '../services/groq.js';
const CATEGORY_SLUGS = new Set([
    'consulta-general',
    'derecho-de-familia',
    'derecho-laboral',
    'derecho-civil',
    'derecho-penal',
    'derecho-comercial-empresarial',
    'contratos',
    'sucesiones',
    'danos-y-perjuicios',
    'proteccion-de-datos-y-privacidad',
    'otro'
]);
const SUBCATEGORY_SLUGS = new Set([
    'orientacion-legal',
    'analisis-de-caso',
    'consulta-urgente',
    'divorcio',
    'tenencia-y-alimentos',
    'violencia-domestica',
    'despidos',
    'reclamos-laborales',
    'acoso-laboral',
    'conflictos-civiles',
    'cobro-de-deudas',
    'responsabilidad-civil',
    'reclamo-soa',
    'defensa-penal',
    'medidas-cautelares',
    'asesoramiento-empresarial',
    'sociedades',
    'conflictos-comerciales',
    'redaccion',
    'revision',
    'incumplimientos',
    'herencias',
    'testamentos',
    'conflictos-sucesorios',
    'accidentes',
    'indemnizaciones',
    'reclamos-a-aseguradoras',
    'datos-personales',
    'confidencialidad',
    'cumplimiento-legal',
    'otro'
]);
const INTENT_MAP = {
    // If you train intents with these names, you'll get better results.
    despido: { category: 'derecho-laboral', subcategory: 'despidos' },
    'reclamo-laboral': { category: 'derecho-laboral', subcategory: 'reclamos-laborales' },
    'acoso-laboral': { category: 'derecho-laboral', subcategory: 'acoso-laboral' },
    divorcio: { category: 'derecho-de-familia', subcategory: 'divorcio' },
    tenencia: { category: 'derecho-de-familia', subcategory: 'tenencia-y-alimentos' },
    alimentos: { category: 'derecho-de-familia', subcategory: 'tenencia-y-alimentos' },
    'violencia-domestica': { category: 'derecho-de-familia', subcategory: 'violencia-domestica' },
    contrato: { category: 'contratos' },
    sucesion: { category: 'sucesiones' },
    herencia: { category: 'sucesiones', subcategory: 'herencias' },
    testamento: { category: 'sucesiones', subcategory: 'testamentos' },
    accidente: { category: 'danos-y-perjuicios', subcategory: 'accidentes' },
    aseguradora: { category: 'danos-y-perjuicios', subcategory: 'reclamos-a-aseguradoras' },
    penal: { category: 'derecho-penal' },
    denuncia: { category: 'derecho-penal', subcategory: 'defensa-penal' },
    privacidad: { category: 'proteccion-de-datos-y-privacidad' }
};
// Wit.ai training plan support:
// - Category is modeled as an Intent (snake_case)
// - Subcategory is modeled as an Entity value on the entity `subcategoria` (snake_case)
const CATEGORY_INTENT_MAP = {
    consulta_general: 'consulta-general',
    derecho_familia: 'derecho-de-familia',
    derecho_laboral: 'derecho-laboral',
    derecho_civil: 'derecho-civil',
    derecho_penal: 'derecho-penal',
    derecho_comercial: 'derecho-comercial-empresarial',
    contratos: 'contratos',
    sucesiones: 'sucesiones',
    danos_y_perjuicios: 'danos-y-perjuicios',
    proteccion_datos: 'proteccion-de-datos-y-privacidad'
};
const SUBCATEGORY_ENTITY_MAP = {
    orientacion_legal: 'orientacion-legal',
    analisis_de_caso: 'analisis-de-caso',
    consulta_urgente: 'consulta-urgente',
    divorcio: 'divorcio',
    tenencia_y_alimentos: 'tenencia-y-alimentos',
    violencia_domestica: 'violencia-domestica',
    despidos: 'despidos',
    reclamos_laborales: 'reclamos-laborales',
    acoso_laboral: 'acoso-laboral',
    conflictos_civiles: 'conflictos-civiles',
    cobro_de_deudas: 'cobro-de-deudas',
    responsabilidad_civil: 'responsabilidad-civil',
    reclamo_soa: 'reclamo-soa',
    defensa_penal: 'defensa-penal',
    denuncias: 'defensa-penal',
    medidas_cautelares: 'medidas-cautelares',
    asesoramiento_empresarial: 'asesoramiento-empresarial',
    sociedades: 'sociedades',
    conflictos_comerciales: 'conflictos-comerciales',
    redaccion: 'redaccion',
    revision: 'revision',
    incumplimientos: 'incumplimientos',
    herencias: 'herencias',
    testamentos: 'testamentos',
    conflictos_sucesorios: 'conflictos-sucesorios',
    accidentes: 'accidentes',
    indemnizaciones: 'indemnizaciones',
    reclamos_a_aseguradoras: 'reclamos-a-aseguradoras',
    datos_personales: 'datos-personales',
    confidencialidad: 'confidencialidad',
    cumplimiento_legal: 'cumplimiento-legal'
};
function normKey(v) {
    return String(v ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');
}
function pickTopIntent(intents) {
    if (!intents || intents.length === 0)
        return null;
    let best = intents[0];
    for (const i of intents)
        if (i.confidence > best.confidence)
            best = i;
    return best ?? null;
}
function sortIntents(intents) {
    if (!intents)
        return [];
    return [...intents].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
}
function pickEntitySuggestion(entities) {
    if (!entities)
        return null;
    let bestCategory = null;
    let bestSub = null;
    for (const key of Object.keys(entities)) {
        // Wit typically returns arrays of objects.
        const arr = entities[key];
        if (!Array.isArray(arr))
            continue;
        for (const item of arr) {
            const value = item?.value;
            if (typeof value !== 'string')
                continue;
            const v = value.trim();
            const c = typeof item.confidence === 'number' ? item.confidence : 0;
            const normalized = normKey(v);
            const mappedCategory = CATEGORY_INTENT_MAP[normalized];
            if (mappedCategory) {
                if (!bestCategory || c > bestCategory.confidence)
                    bestCategory = { value: mappedCategory, confidence: c };
            }
            const mappedSub = SUBCATEGORY_ENTITY_MAP[normalized];
            if (mappedSub) {
                if (!bestSub || c > bestSub.confidence)
                    bestSub = { value: mappedSub, confidence: c };
            }
            // Back-compat: allow entities to directly return our slugs.
            if (CATEGORY_SLUGS.has(v)) {
                if (!bestCategory || c > bestCategory.confidence)
                    bestCategory = { value: v, confidence: c };
            }
            if (SUBCATEGORY_SLUGS.has(v)) {
                if (!bestSub || c > bestSub.confidence)
                    bestSub = { value: v, confidence: c };
            }
        }
    }
    if (!bestCategory || bestCategory.confidence < 0.6)
        return null;
    return {
        category: bestCategory.value,
        subcategory: bestSub && bestSub.confidence >= 0.6 ? bestSub.value : undefined,
        confidence: Math.max(bestCategory.confidence, bestSub?.confidence ?? 0)
    };
}
function pickSubcategoryFromEntities(entities) {
    if (!entities)
        return null;
    let best = null;
    for (const key of Object.keys(entities)) {
        const arr = entities[key];
        if (!Array.isArray(arr))
            continue;
        for (const item of arr) {
            const value = item?.value;
            if (typeof value !== 'string')
                continue;
            const v = value.trim();
            const c = typeof item.confidence === 'number' ? item.confidence : 0;
            const normalized = normKey(v);
            const mapped = SUBCATEGORY_ENTITY_MAP[normalized] ?? (SUBCATEGORY_SLUGS.has(v) ? v : null);
            if (!mapped)
                continue;
            if (!best || c > best.confidence)
                best = { value: mapped, confidence: c };
        }
    }
    if (!best || best.confidence < 0.55)
        return null;
    return { subcategory: best.value, confidence: best.confidence };
}
function toSuggestion(top) {
    const nameRaw = String(top.name ?? '').trim();
    const name = normKey(nameRaw);
    if (!name)
        return null;
    // If the Wit intent is already a category slug, accept it.
    // This allows you to train intents like "derecho-laboral" directly.
    if (nameRaw.includes('derecho-') || nameRaw === 'consulta-general' || nameRaw === 'contratos' || nameRaw === 'sucesiones' || nameRaw === 'danos-y-perjuicios' || nameRaw === 'proteccion-de-datos-y-privacidad') {
        return { category: nameRaw, confidence: top.confidence };
    }
    const mappedCategory = CATEGORY_INTENT_MAP[name];
    if (mappedCategory)
        return { category: mappedCategory, confidence: top.confidence };
    const mapped = INTENT_MAP[name] ?? INTENT_MAP[nameRaw];
    if (!mapped)
        return null;
    return {
        category: mapped.category,
        subcategory: mapped.subcategory,
        confidence: top.confidence
    };
}
export function registerIntakeRoutes(router) {
    router.get('/intake/suggest', async (req, res) => {
        const parsed = intakeSuggestQuerySchema.safeParse(req.query);
        if (!parsed.success)
            return res.status(400).json({ message: 'Datos inválidos' });
        if (!config.witServerAccessToken) {
            const payload = { enabled: false, suggestion: null, alternatives: [] };
            return res.json(payload);
        }
        const { text } = parsed.data;
        const url = `https://api.wit.ai/message?v=20240101&q=${encodeURIComponent(text)}`;
        let body;
        try {
            const r = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${config.witServerAccessToken}`
                }
            });
            if (!r.ok) {
                const payload = { enabled: true, suggestion: null, alternatives: [] };
                return res.json(payload);
            }
            body = (await r.json());
        }
        catch {
            const payload = { enabled: true, suggestion: null, alternatives: [] };
            return res.json(payload);
        }
        // Back-compat: if entities already carry both category + subcategory, accept them.
        const entityCategorySuggestion = pickEntitySuggestion(body.entities);
        if (entityCategorySuggestion) {
            const payload = { enabled: true, suggestion: entityCategorySuggestion, alternatives: [] };
            return res.json(payload);
        }
        const intents = sortIntents(body.intents);
        const alternatives = intents
            .slice(0, 3)
            .map((i) => toSuggestion(i))
            .filter((s) => Boolean(s))
            .filter((s) => s.confidence >= 0.45);
        const topCategory = alternatives[0] ?? null;
        const subEntity = pickSubcategoryFromEntities(body.entities);
        // If we have a reasonable category intent, merge with subcategory entity.
        // This matches the intended Wit.ai training: category=Intent, subcategory=Entity.
        const merged = topCategory
            ? {
                category: topCategory.category,
                subcategory: subEntity?.subcategory,
                confidence: Math.max(topCategory.confidence, subEntity?.confidence ?? 0)
            }
            : null;
        const suggestion = merged && merged.confidence >= 0.6 ? merged : alternatives.find((s) => s.confidence >= 0.65) ?? null;
        const payload = { enabled: true, suggestion, alternatives };
        return res.json(payload);
    });
    // Chat endpoint using Groq AI
    router.post('/intake/chat', async (req, res) => {
        try {
            const { message, history } = req.body;
            if (!message || typeof message !== 'string' || message.trim().length === 0) {
                return res.status(400).json({ error: 'Mensaje requerido' });
            }
            if (message.length > 1000) {
                return res.status(400).json({ error: 'Mensaje demasiado largo' });
            }
            const conversationHistory = (history ?? [])
                .slice(-10) // Máximo 10 mensajes de historial
                .map((m) => ({
                role: m.role,
                content: m.content.slice(0, 500)
            }));
            const result = await chatWithGroq(message.trim(), conversationHistory);
            return res.json({
                reply: result.reply,
                category: result.category,
                subcategory: result.subcategory
            });
        }
        catch (error) {
            console.error('Chat error:', error);
            return res.status(500).json({ error: 'Error al procesar el mensaje' });
        }
    });
    // Check if AI chat is available
    router.get('/intake/chat/status', (_req, res) => {
        return res.json({
            enabled: Boolean(config.groqApiKey),
            provider: config.groqApiKey ? 'groq' : null
        });
    });
}
//# sourceMappingURL=intake.js.map