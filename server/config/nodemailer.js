import nodemailer from "nodemailer";

// Cloud platforms like Render block port 587 on free tiers; port 2525 is open and officially supported by Brevo
const configuredPort = parseInt(process.env.SMTP_PORT, 10);
const primaryPort = configuredPort && configuredPort !== 587 ? configuredPort : 2525;

export const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
    port: primaryPort,
    secure: primaryPort === 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
});

const sendEmail = async ({ to, subject, body }) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error("❌ Cannot send email: SMTP_USER or SMTP_PASS environment variable is missing on server!");
        throw new Error("SMTP credentials missing from environment (SMTP_USER / SMTP_PASS)");
    }

    const sender = process.env.SENDER_EMAIL || "saraswatishan24@gmail.com";
    const host = process.env.SMTP_HOST || "smtp-relay.brevo.com";
    
    // Try primary port (2525), and fallback to 587 if needed
    const portsToTry = [primaryPort];
    if (primaryPort !== 587) portsToTry.push(587);
    if (primaryPort !== 2525) portsToTry.unshift(2525);

    let lastError = null;
    for (const port of portsToTry) {
        try {
            console.log(`📧 Sending email via ${host}:${port} to: ${to} from: ${sender}`);
            const t = nodemailer.createTransport({
                host: host,
                port: port,
                secure: port === 465,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                },
                connectionTimeout: 10000,
                greetingTimeout: 10000,
                socketTimeout: 15000
            });

            const response = await t.sendMail({
                from: sender,
                to: to,
                subject: subject,
                html: body
            });

            console.log(`✅ Email sent successfully via port ${port}! MessageId: ${response.messageId}`);
            return response;
        } catch (err) {
            console.warn(`⚠️ Failed sending email on port ${port}:`, err.message);
            lastError = err;
        }
    }

    throw lastError;
};

export default sendEmail;

