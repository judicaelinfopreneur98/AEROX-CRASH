const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'mail.bretonwebexpert.fr',
  port: 465,
  secure: true,
  auth: {
    user: 'info@bretonwebexpert.fr',
    pass: 'U#BM*O%=bw5LTwTw',
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
  logger: true,
  debug: true
});

transporter.verify((error, success) => {
  if (error) {
    console.error('VERIFY ERROR:', error);
    process.exit(1);
  } else {
    console.log('VERIFY SUCCESS: Server is ready to take our messages');
    transporter.sendMail({
      from: '"AEROX CRASH" <info@bretonwebexpert.fr>',
      to: 'expertbretonweb@gmail.com',
      subject: '⚡ Test Code AEROX: 748291',
      text: 'Votre code de vérification AEROX est : 748291'
    }, (err, info) => {
      if (err) {
        console.error('SEND ERROR:', err);
        process.exit(1);
      } else {
        console.log('SEND SUCCESS:', info.response, info.messageId);
        process.exit(0);
      }
    });
  }
});
