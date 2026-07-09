import { Injectable, InternalServerErrorException } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';
import { ContactMessageDto } from './dto/contact-message.dto';

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
    try {
      await this.transporter.sendMail({
        from: `${process.env.SMTP_MAIL_TITLE} <${process.env.SMTP_USER}>`,
        to: `${process.env.SMTP_TEST_EMAIL}`,
        subject: '[IU] test message',
        text: 'This is a simple message to test work of the SMTP',
      });
      return true;
    } catch (e) {
      console.error('sendTestMail failed:', e);
      throw e;
    }
  }

  async sendContactMessage({ email, message, topic }: ContactMessageDto) {
    const recipient = process.env.SMTP_TEST_EMAIL;

    if (!recipient) {
      throw new InternalServerErrorException('SMTP_TEST_EMAIL is not configured');
    }

    const safeTopic = this.sanitizeHeaderValue(topic);
    const safeMessage = this.sanitizePlainText(message);
    const subject = safeTopic
      ? `[IU] Contact message: ${safeTopic}`
      : '[IU] Contact message';

    await this.transporter.sendMail({
      from: `${process.env.SMTP_MAIL_TITLE} <${process.env.SMTP_USER}>`,
      to: recipient,
      replyTo: email,
      subject,
      text: [
        `From: ${email}`,
        `Topic: ${safeTopic ?? 'undefined'}`,
        '',
        'Message:',
        safeMessage,
      ].join('\n'),
    });

    return true;
  }

  async sendActivationLink(to: string, link: string) {
    console.log('try to send the activation link (service mail)');
    const recipient =
      process.env.NODE_ENV === 'development' ? process.env.SMTP_TEST_EMAIL : to;
    const fullActivationLink = `${process.env.API_URL}/activate/${link}`;

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

  async sendJoinToGroupRequestForCheck(
    to: string, // Owner of the group
    userNicknameToJoin: string,
    groupName: string,
  ) {
    console.log(
      'try to send the join to group request for check (service mail)',
    );
    const recipient =
      process.env.NODE_ENV === 'development' ? process.env.SMTP_TEST_EMAIL : to;

    console.log('mode:', process.env.NODE_ENV);
    console.log('recipient: ', recipient);

    const userText = `User: ${userNicknameToJoin}`;
    const groupNameText = `Group: ${groupName}`;

    await this.transporter.sendMail({
      from: `${process.env.SMTP_MAIL_TITLE} <${process.env.SMTP_USER}>`,
      to: recipient,
      subject: '[IU] Request to join to group',
      text: '',
      html: `    
                <div>
                  <h3>Request to join the group</h3>
                  <p>${userText}</p>
                  <p>${groupNameText}</p>
  
                  <p>Review your group to approve the user.</p>       
                </div>
            `,
    });
  }

  async sendUserApprovedStatusJoinGroup(to: string, groupName: string) {
    console.log('Try to send to user approved joining status');
    const recipient =
      process.env.NODE_ENV === 'development' ? process.env.SMTP_TEST_EMAIL : to;
    await this.transporter.sendMail({
      from: `${process.env.SMTP_MAIL_TITLE} <${process.env.SMTP_USER}>`,
      to: recipient,
      subject: '[IU] Join request approved',
      text: '',
      html: `    
                <div>
                  <h3>Your request to join has been approved!</h3>
                  <p>Group: ${groupName}</p>    
                </div>
            `,
    });
  }

  async sendUserResetPasswordLink(to: string, resetToken: string) {
    console.log('Try to send to user reset password link');
    const recipient =
      process.env.NODE_ENV === 'development' ? process.env.SMTP_TEST_EMAIL : to;

    const fullResetPasswordLink = `${process.env.API_URL}/reset-password/${resetToken}`;

    await this.transporter.sendMail({
      from: `${process.env.SMTP_MAIL_TITLE} <${process.env.SMTP_USER}>`,
      to: recipient,
      subject: '[IU] Reset password link',
      text: '',
      html: `    
                <div>
                    <div style="
                        display: block;
                        width: 100%;
                        gap: 15px;
                        "
                    >
                        <h1>Password Reset in the IU Portal</h1>
                        <p>Click the button below to proceed with the password reset process.</p>
                        <p>If you did not request a password change, please ignore this message.</p>       
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
                        " href="${fullResetPasswordLink}">
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
                            >Change password</button>    
                        </a>
                    </div>
                </div>
            `,
    });
  }

  private sanitizeHeaderValue(value?: string) {
    if (!value) return undefined;

    return value.replace(/[\r\n]/g, ' ').replace(/\p{C}/gu, '').trim();
  }

  private sanitizePlainText(value: string) {
    return value
      .replace(/\r\n?/g, '\n')
      .replace(/[^\S\n\t]+/g, ' ')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .trim();
  }
}
