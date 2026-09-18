import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const sendEmail = async (to, subject, body)=>{
    const response = await transporter.sendMail({
        from: process.env.SENDER_EMAIL,
        to: to,
        subject: subject,
        html: body
    });
    return response;
}

export default sendEmail;
