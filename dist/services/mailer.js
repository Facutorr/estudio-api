import nodemailer from 'nodemailer';
import { config } from '../config.js';
let cachedTransport = null;
function getTransport() {
    if (cachedTransport)
        return cachedTransport;
    const { host, port, user, pass } = config.smtp;
    if (!host || !user || !pass)
        return null;
    cachedTransport = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
    });
    return cachedTransport;
}
export async function sendNotificationEmail(args) {
    const to = config.contactEmail;
    const from = config.smtp.from;
    const transport = getTransport();
    if (!transport || !to || !from)
        return false;
    try {
        await transport.sendMail({
            to,
            from,
            subject: args.subject,
            text: args.text
        });
        return true;
    }
    catch (err) {
        console.error('Error enviando email de contacto:', err);
        return false;
    }
}
//# sourceMappingURL=mailer.js.map