import { pool } from '../db/pool.js';
function legacyCostUyu(reportType) {
    const honorarios = 9900;
    return honorarios;
}
export async function calculateCostUyu(reportType) {
    try {
        const r = await pool.query(`select base_cost_uyu as "baseCostUyu", legal_fee_uyu as "legalFeeUyu"
       from legal_services
       where slug = $1 and enabled = true
       limit 1`, [reportType]);
        const row = r.rows[0];
        if (!row)
            return legacyCostUyu(reportType);
        return Number(row.baseCostUyu) + Number(row.legalFeeUyu);
    }
    catch {
        // En caso de que la tabla aún no exista o haya error DB, usar fallback.
        return legacyCostUyu(reportType);
    }
}
//# sourceMappingURL=pricing.js.map