const crypto = require('crypto');
const hashService = require('./hash-service');
const nodemailer = require('nodemailer');


const smsSid = process.env.SMS_SID;
const smsAuthToken = process.env.SMS_AUTH_TOKEN;
// const twilio = require('twilio')(smsSid, smsAuthToken, {
//     lazyLoading: true,
// });

class OtpService {
    async generateOtp() {
        const otp = crypto.randomInt(1000, 9999);
        return otp;
    }

    // async sendBySms(phone, otp) {
    //     return await twilio.messages.create({
    //         to: phone,
    //         from: process.env.SMS_FROM_NUMBER,
    //         body: `Your mentza OTP is ${otp}`,
    //     });
    // }

    async sendByEmail(email, otp) {
        const transporter = nodemailer.createTransport({
            host: "smtp.sendgrid.net",
            port: 587,
            auth: {
                user: "apikey",                 pass: process.env.SENDGRID_API_TWILIO,
            },
        });
        console.log(email);
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your OTP Code',
            text: `Your OTP code is ${otp}`,
        };

        return await transporter.sendMail(mailOptions);
    }

    verifyOtp(hashedOtp, data) {
        let computedHash = hashService.hashOtp(data);
        return computedHash === hashedOtp;
    }
}

module.exports = new OtpService();
