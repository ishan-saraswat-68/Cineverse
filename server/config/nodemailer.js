import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: false, // port 587 uses STARTTLS
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    connectionTimeout: 10000, // 10s connection timeout
    greetingTimeout: 10000,   // 10s greeting timeout
    socketTimeout: 15000      // 15s socket timeout
});

const sendEmail = async ({ to, subject, body }) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error("❌ Cannot send email: SMTP_USER or SMTP_PASS environment variable is missing on server!");
        throw new Error("SMTP credentials missing from environment (SMTP_USER / SMTP_PASS)");
    }

    const sender = process.env.SENDER_EMAIL || "ishansaraswat68@gmail.com";
    console.log(`📧 Attempting to send email via ${process.env.SMTP_HOST || 'smtp-relay.brevo.com'} to: ${to} from: ${sender}`);

    const response = await transporter.sendMail({
        from: sender,
        to: to,
        subject: subject,
        html: body
    });

    console.log(`✅ Email sent successfully! MessageId: ${response.messageId}`);
    return response;
};

export default sendEmail;

