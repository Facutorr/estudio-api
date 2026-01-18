import { pool } from '../db/pool.js';
import { encryptJson } from '../crypto.js';
import { contactCreateSchema } from '../validation.js';
import { sendNotificationEmail } from '../services/mailer.js';
export function registerContactRoutes(router) {
    router.post('/contact', async (req, res) => {
        const parsed = contactCreateSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ message: 'Datos inválidos' });
        const data = parsed.data;
        const piiEncrypted = encryptJson({
            name: data.name,
            email: data.email,
            phone: data.phone ?? '',
            pais: data.pais,
            departamento: data.departamento,
            subcategoria: data.subcategoria ?? '',
            subcategoriaDetalle: data.subcategoriaDetalle ?? '',
            message: data.message
        });
        const r = await pool.query(`insert into contact_messages(subject, pii_encrypted)
       values ($1,$2)
       returning id`, [data.subject, piiEncrypted]);
        // Best-effort notification email (requires SMTP config)
        await sendNotificationEmail({
            subject: `Nuevo contacto: ${data.subject}`,
            text: `Nombre: ${data.name}\n` +
                `Email: ${data.email}\n` +
                `Teléfono: ${data.phone ?? ''}\n` +
                `País: ${data.pais}\n` +
                `Departamento: ${data.departamento}\n` +
                (data.subcategoria ? `Subcategoría: ${data.subcategoria}\n` : '') +
                (data.subcategoriaDetalle ? `Especificar: ${data.subcategoriaDetalle}\n` : '') +
                `Asunto: ${data.subject}\n\n` +
                `${data.message}`
        });
        return res.json({ ok: true, id: r.rows[0].id });
    });
}
//# sourceMappingURL=contact.js.map