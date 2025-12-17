import { Injectable } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport(
      {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      },
      {
        from: `<${process.env.SMTP_USER}>`,
      },
    );
  }

  async sendTestMail() {
    console.log('try to send email (service mail)');

    await this.transporter
      .sendMail({
        from: `${process.env.SMTP_MAIL_TITLE} <${process.env.SMTP_USER}>`,
        to: `${process.env.SMTP_TEST_EMAIL}`,
        subject: '[IU] test message',
        text: 'This is a simple message to test work of the SMTP',
      })
      .catch((e) => {
        console.log(e);
        return new Error(e);
      });
    return true;
  }

  async sendActivationLink(to: string, link: string) {
    console.log('try to send the activation link (service mail)');
    const recipient =
      process.env.NODE_ENV === 'development' ? process.env.SMTP_TEST_EMAIL : to;
    const fullActivationLink = `${process.env.API_URL}/api/activate/${link}`;

    await this.transporter.sendMail({
      from: `${process.env.SMTP_MAIL_TITLE} <${process.env.SMTP_USER}>`,
      to: recipient,
      subject: '[IU] Confirm E-mail address',
      text: '',
      html: `    
                <div>
                    <div style="
                        display: block;
                        width: 100%;
                        gap: 15px;
                        "
                    >
                        <h1>Welcome to IU!</h1>
                        <p>Click on the button below to confirm the email address and activate the account.</p>
                        <p>If you have not registered, then do not press the button.</p>       
                    </div>
                    <div style="
                        display: flex;
                        align-items: center;
                        width: 100%;
                    "
                    >
                        <a style="
                            position: relative;
                            display: block;
                        " href="${fullActivationLink}">
                            <button style="
                                position: relative;
                                background-color: #0145f0;
                                font-weight: bold;
                                color: antiquewhite; 
                                padding: 10px; 
                                border-radius: 5px; 
                                border: none; 
                                text-decoration: none;
                                cursor: pointer;
                                "
                            >Confirm my email</button>    
                        </a>
                    </div>
                </div>
            `,
    });
  }
}
