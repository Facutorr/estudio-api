import nodemailer from 'nodemailer';
import { config } from '../config.js';
let cachedTransport = null;
function getTransport() {
    if (cachedTransport)
        return cachedTransport;
    const { host, port, user, pass } = config.smtp;
    console.log('[SMTP] Config:', { host, port, user, hasPass: !!pass, from: config.smtp.from });
    if (!host || !user || !pass) {
        console.log('[SMTP] Missing config, skipping email');
        return null;
    }
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
    console.log('[SMTP] Attempting to send email to:', to, 'from:', from);
    const transport = getTransport();
    if (!transport || !to || !from) {
        console.log('[SMTP] Cannot send - transport:', !!transport, 'to:', to, 'from:', from);
        return false;
    }
    try {
        const result = await transport.sendMail({
            to,
            from,
            subject: args.subject,
            text: args.text
        });
        console.log('[SMTP] Email sent successfully:', result.messageId);
        return true;
    }
    catch (err) {
        console.error('[SMTP] Error enviando email:', err);
        return false;
    }
}
//# sourceMappingURL=mailer.js.map