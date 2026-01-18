import { pool } from '../db/pool.js';
export function registerServicesRoutes(router) {
    router.get('/services', async (_req, res) => {
        try {
            const r = await pool.query(`select id, slug, name, description,
                base_cost_uyu as "baseCostUyu",
                legal_fee_uyu as "legalFeeUyu",
                enabled
         from legal_services
         where enabled = true
         order by name asc`);
            if (r.rows.length > 0) {
                const items = r.rows.map((s) => ({
                    ...s,
                    totalUyu: Number(s.baseCostUyu) + Number(s.legalFeeUyu)
                }));
                return res.json({ items });
            }
        }
        catch {
            // ignore
        }
        // fallback (demo)
        const honorarios = 9900;
        const items = [
            {
                id: 'legacy:consulta-general',
                slug: 'consulta-general',
                name: 'Consulta general',
                description: 'Orientación inicial y evaluación del caso.',
                baseCostUyu: 0,
                legalFeeUyu: honorarios,
                totalUyu: honorarios,
                enabled: true
            },
            {
                id: 'legacy:problemas-familiares',
                slug: 'problemas-familiares',
                name: 'Problemas familiares',
                description: 'Divorcio, tenencia, alimentos y régimen de visitas.',
                baseCostUyu: 0,
                legalFeeUyu: honorarios,
                totalUyu: honorarios,
                enabled: true
            },
            {
                id: 'legacy:problemas-laborales',
                slug: 'problemas-laborales',
                name: 'Problemas laborales',
                description: 'Despidos, liquidaciones, reclamos y asesoramiento.',
                baseCostUyu: 0,
                legalFeeUyu: honorarios,
                totalUyu: honorarios,
                enabled: true
            },
            {
                id: 'legacy:conflictos-civiles',
                slug: 'conflictos-civiles',
                name: 'Conflictos civiles',
                description: 'Daños, incumplimientos y conflictos entre particulares.',
                baseCostUyu: 0,
                legalFeeUyu: honorarios,
                totalUyu: honorarios,
                enabled: true
            },
            {
                id: 'legacy:defensa-penal',
                slug: 'defensa-penal',
                name: 'Defensa penal',
                description: 'Asistencia y defensa en procesos penales.',
                baseCostUyu: 0,
                legalFeeUyu: honorarios,
                totalUyu: honorarios,
                enabled: true
            },
            {
                id: 'legacy:empresas-y-contratos',
                slug: 'empresas-y-contratos',
                name: 'Empresas y contratos',
                description: 'Contratos, sociedades y asesoramiento empresarial.',
                baseCostUyu: 0,
                legalFeeUyu: honorarios,
                totalUyu: honorarios,
                enabled: true
            },
            {
                id: 'legacy:herencias-y-sucesiones',
                slug: 'herencias-y-sucesiones',
                name: 'Herencias y sucesiones',
                description: 'Sucesiones, herencias y particiones.',
                baseCostUyu: 0,
                legalFeeUyu: honorarios,
                totalUyu: honorarios,
                enabled: true
            },
            {
                id: 'legacy:privacidad-y-datos-personales',
                slug: 'privacidad-y-datos-personales',
                name: 'Privacidad y datos personales',
                description: 'Protección de datos, privacidad y compliance.',
                baseCostUyu: 0,
                legalFeeUyu: honorarios,
                totalUyu: honorarios,
                enabled: true
            }
        ];
        return res.json({ items });
    });
}
//# sourceMappingURL=services.js.map