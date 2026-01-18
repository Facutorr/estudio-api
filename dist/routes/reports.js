import { pool } from '../db/pool.js';
import { encryptJson } from '../crypto.js';
import { reportSchema } from '../validation.js';
import { calculateCostUyu } from '../services/pricing.js';
import { sendNotificationEmail } from '../services/mailer.js';
export function registerReportRoutes(router) {
    router.post('/reports', async (req, res) => {
        const parsed = reportSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ message: 'Datos inválidos' });
        const data = parsed.data;
        // Recalcular costo en servidor (no confiar en cliente)
        const expected = await calculateCostUyu(data.tipo);
        if (data.costoUyu !== expected) {
            return res.status(400).json({ message: 'Costo inválido' });
        }
        const idNumber = data.idNumber.replace(/\D/g, '');
        const piiEncrypted = encryptJson({
            idType: data.idType,
            idNumber,
            email: data.email,
            celular: data.celular,
            nombre: data.nombre,
            apellido: data.apellido,
            categoria: data.categoria ?? '',
            subcategoria: data.subcategoria ?? '',
            subcategoriaDetalle: data.subcategoriaDetalle ?? ''
        });
        const r = await pool.query(`insert into reports(report_type, country, department, city, cost_uyu, pii_encrypted)
       values ($1,$2,$3,$4,$5,$6)
       returning id`, [data.tipo, data.pais, data.departamento, data.ciudad, data.costoUyu, piiEncrypted]);
        // Best-effort: guardar metadatos no sensibles (si el schema fue actualizado)
        try {
            await pool.query('update reports set id_type = $1, details = $2 where id = $3', [data.idType, data.details ?? '', r.rows[0].id]);
        }
        catch {
            // ignore
        }
        // Best-effort notification email (requires SMTP config)
        await sendNotificationEmail({
            subject: `Nueva denuncia: ${data.tipo}`,
            text: `Tipo: ${data.tipo}\n` +
                (data.categoria ? `Categoría: ${data.categoria}\n` : '') +
                (data.subcategoria ? `Subcategoría: ${data.subcategoria}\n` : '') +
                (data.subcategoriaDetalle ? `Especificar: ${data.subcategoriaDetalle}\n` : '') +
                `País: ${data.pais}\n` +
                `Departamento: ${data.departamento}\n` +
                `Ciudad: ${data.ciudad}\n` +
                `Costo (UYU): ${data.costoUyu}\n\n` +
                `Contacto:\n` +
                `- Nombre: ${data.nombre} ${data.apellido}\n` +
                `- Email: ${data.email}\n` +
                `- Teléfono: ${data.celular}\n\n` +
                (data.details ? `Detalles:\n${data.details}\n` : '')
        });
        return res.json({ ok: true, id: r.rows[0].id });
    });
}
//# sourceMappingURL=reports.js.map